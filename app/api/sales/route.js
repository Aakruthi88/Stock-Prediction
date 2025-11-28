import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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
        const { error: rpcError } = await supabase.rpc('decrement_stock', {
            row_id: item_id,
            amount: qtyToAdd
        });

        if (rpcError) {
            // Fallback: Manual fetch and update
            const { data: itemData } = await supabase
                .from('items')
                .select('stock')
                .eq('item_id', item_id)
                .single();

            if (itemData) {
                await supabase
                    .from('items')
                    .update({ stock: Math.max(0, itemData.stock - qtyToAdd) })
                    .eq('item_id', item_id);
            }
        }

        // 4. Trigger Demand Feature Update (Fire and forget)
        // We call our own API to recalculate demand metrics based on this new sale.
        // We don't await this to keep the UI response fast.
        fetch(`${request.nextUrl.origin}/api/update-demand`, {
            method: 'POST',
        }).catch(err => console.error("Background Demand Update Failed:", err));

        return NextResponse.json(
            { success: true, data: saleData },
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
