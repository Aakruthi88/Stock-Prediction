import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import redis from "@/lib/redis";

export async function POST(request) {
    try {
        const body = await request.json();
        const { item_id, quantity } = body;

        // 1. Validate Input
        if (!item_id || !quantity) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const qtyToAdd = parseInt(quantity);

        // 2. Check for existing record for this item on this date
        const { data: existingSale, error: fetchError } = await supabase
            .from('sales_history')
            .select('sale_id, qty_sold')
            .eq('item_id', item_id)
            .eq('date', date)
            .single();

        let saleData;
        let saleError;

        if (existingSale) {
            // Update existing record (Increment quantity)
            const newQty = existingSale.qty_sold + qtyToAdd;
            const { data, error } = await supabase
                .from('sales_history')
                .update({
                    qty_sold: newQty
                })
                .eq('sale_id', existingSale.sale_id)
                .select();
            saleData = data;
            saleError = error;
        } else {
            // Insert new record
            const { data, error } = await supabase
                .from('sales_history')
                .insert([
                    {
                        item_id,
                        date,
                        qty_sold: qtyToAdd
                    }
                ])
                .select();
            saleData = data;
            saleError = error;
        }

        if (saleError) {
            console.error("Supabase Sales Error:", saleError);
            return NextResponse.json(
                { success: false, error: saleError.message },
                { status: 500 }
            );
        }

        // 3. Update stock level in 'items' table
        // We try to use the RPC 'decrement_stock' first, if it fails (not exists), we do manual update.
        let stockUpdated = false;
        let finalStock = -1;
        let debugInfo = {};

        // Attempt RPC first
        const { error: rpcError } = await supabase.rpc('decrement_stock', {
            row_id: item_id,
            amount: qtyToAdd
        });

        if (!rpcError) {
            stockUpdated = true;
            // Fetch the new stock to return it
            const { data: updatedItem } = await supabase
                .from('items')
                .select('stock_level')
                .eq('item_id', item_id)
                .single();
            if (updatedItem) finalStock = updatedItem.stock_level;
        } else {
            debugInfo.rpcError = rpcError.message;
            console.warn("RPC decrement_stock failed or not found, falling back to manual update:", rpcError.message);

            // Fallback: Manual fetch and update
            // Note: The column is 'stock_level', not 'stock'
            const { data: itemData, error: itemFetchError } = await supabase
                .from('items')
                .select('stock_level')
                .eq('item_id', item_id)
                .single();

            if (itemFetchError) {
                debugInfo.itemFetchError = itemFetchError.message;
                console.error("Error fetching item for stock update:", itemFetchError);
            } else if (itemData) {
                const currentStock = parseInt(itemData.stock_level);
                const newStock = Math.max(0, currentStock - qtyToAdd);
                const { error: updateError } = await supabase
                    .from('items')
                    .update({ stock_level: newStock })
                    .eq('item_id', item_id);

                if (updateError) {
                    debugInfo.updateError = updateError.message;
                    console.error("Error updating item stock manually:", updateError);
                } else {
                    stockUpdated = true;
                    finalStock = newStock;
                    console.log(`Manually updated stock_level for item ${item_id} from ${currentStock} to ${newStock}`);
                }
            } else {
                debugInfo.itemData = "Item not found";
            }
        }

        // 4. Update Redis Cache
        try {
            const CACHE_KEY = 'inventory_predictions_v2';
            const cached = await redis.get(CACHE_KEY);
            if (cached) {
                let cachedData = JSON.parse(cached);
                // Ensure item_id comparison handles string/number differences
                const itemIndex = cachedData.findIndex(item => String(item.item_id) === String(item_id));

                if (itemIndex !== -1) {
                    // Update the stock in the cache
                    // Use finalStock if available, otherwise calculate from cache

                    let currentCacheStock = 0;
                    if (cachedData[itemIndex].stock_level !== undefined) {
                        currentCacheStock = parseInt(cachedData[itemIndex].stock_level);
                    } else if (cachedData[itemIndex].stock !== undefined) {
                        currentCacheStock = parseInt(cachedData[itemIndex].stock);
                    }

                    const newCacheStock = finalStock !== -1 ? finalStock : Math.max(0, currentCacheStock - qtyToAdd);

                    // Update both fields to be safe and consistent
                    // Force update even if key doesn't exist to ensure consistency
                    cachedData[itemIndex].stock = newCacheStock;
                    cachedData[itemIndex].stock_level = newCacheStock;

                    await redis.set(CACHE_KEY, JSON.stringify(cachedData), 'EX', 300);
                    console.log(`Updated Redis Cache for item ${item_id} to ${newCacheStock}`);
                } else {
                    console.log("Item not found in Redis cache:", item_id);
                    debugInfo.redis = "Item not found in cache";
                }
            } else {
                console.log("No Redis cache found to update.");
                debugInfo.redis = "No cache found";
            }
        } catch (e) {
            console.error("Failed to update Redis cache:", e);
            debugInfo.redisError = e.message;
        }

        // 5. Trigger Demand Feature Update (Fire and forget)
        // We call our own API to recalculate demand metrics based on this new sale.
        // We don't await this to keep the UI response fast.
        fetch(`${request.nextUrl.origin}/api/update-demand`, {
            method: 'POST',
        }).catch(err => console.error("Background Demand Update Failed:", err));

        return NextResponse.json(
            { success: true, data: saleData, new_stock: finalStock, stock_updated: stockUpdated, debug: debugInfo },
            { status: 201 }
        );

    } catch (err) {
        console.error("Unexpected Error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
