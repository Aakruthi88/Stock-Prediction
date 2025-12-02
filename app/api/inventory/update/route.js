import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, category, expiryDate, quantity, unitPrice, holdingCost, handlingCost } = body;

        if (!name || quantity === undefined) {
            return Response.json({ error: "Name and Quantity are required" }, { status: 400 });
        }

        // 1. Check if item exists
        const { data: existingItems, error: findError } = await supabase
            .from('items')
            .select('*')
            .eq('name', name)
            .limit(1);

        if (findError) {
            console.error("Error finding item:", findError);
            return Response.json({ error: findError.message }, { status: 500 });
        }

        const existingItem = existingItems?.[0];

        if (existingItem) {
            // --- RESTOCK LOGIC ---
            console.log(`Restocking existing item: ${name}`);

            const oldStock = existingItem.stock_level || 0;
            const newStock = oldStock + quantity;

            // Calculate Reorder Frequency (days since last restock)
            let reorderFrequency = existingItem.reorder_frequency_days;
            if (existingItem.last_restock_date) {
                const lastDate = new Date(existingItem.last_restock_date);
                const today = new Date();
                const diffTime = Math.abs(today - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                reorderFrequency = diffDays;
            }

            // Parse Expiry Date (dd/mm/yyyy -> yyyy-mm-dd)
            let parsedExpiryDate = null;
            if (expiryDate) {
                const parts = expiryDate.split('/');
                if (parts.length === 3) {
                    parsedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            // Update Item
            const { data: updatedItem, error: updateError } = await supabase
                .from('items')
                .update({
                    stock_level: newStock,
                    last_restock_date: new Date().toISOString(),
                    reorder_point: oldStock,
                    reorder_frequency_days: reorderFrequency,
                    unit_price: unitPrice,
                    holding_cost_per_unit_day: holdingCost,
                    handling_cost_per_unit: handlingCost,
                    expiry_date: parsedExpiryDate
                })
                .eq('item_id', existingItem.item_id)
                .select()
                .single();

            if (updateError) {
                console.error("Error updating item:", updateError);
                return Response.json({ error: updateError.message }, { status: 500 });
            }

            return Response.json({ success: true, item: updatedItem });

        } else {
            // --- NEW ITEM LOGIC ---
            console.log(`Creating new item: ${name}`);

            // 1. Calculate Means (using last 100 items for efficiency)
            const { data: recentStats, error: aggError } = await supabase
                .from('items')
                .select('reorder_point, reorder_frequency_days, lead_time_days, item_popularity_score')
                .order('date_added', { ascending: false })
                .limit(100);

            if (aggError) {
                console.error("Error fetching stats:", aggError);
                // Continue with defaults if stats fail
            }

            const totalItems = recentStats?.length || 0;
            const meanReorderPoint = totalItems > 0
                ? recentStats.reduce((acc, curr) => acc + (curr.reorder_point || 0), 0) / totalItems
                : 10;
            const meanFrequency = totalItems > 0
                ? recentStats.reduce((acc, curr) => acc + (curr.reorder_frequency_days || 0), 0) / totalItems
                : 7;
            const meanLeadTime = totalItems > 0
                ? recentStats.reduce((acc, curr) => acc + (curr.lead_time_days || 0), 0) / totalItems
                : 3;
            const meanPopularity = totalItems > 0
                ? recentStats.reduce((acc, curr) => acc + (curr.item_popularity_score || 0), 0) / totalItems
                : 0.5;

            // 2. Find the Highest Existing ID
            // Strategy: Fetch top 1 by item_id DESC (lexicographical max) AND top 1 by date_added DESC (temporal max)
            // This covers cases where string sort might fail (e.g. ITM9 vs ITM10) or date sort fails (backfilling).

            const [{ data: maxIdItem }, { data: lastAddedItem }] = await Promise.all([
                supabase.from('items').select('item_id').order('item_id', { ascending: false }).limit(1).single(),
                supabase.from('items').select('item_id').order('date_added', { ascending: false }).limit(1).single()
            ]);

            let maxIdNum = 0;

            const parseId = (idStr) => {
                if (!idStr) return 0;
                const match = idStr.match(/ITM(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };

            const maxLex = maxIdItem ? parseId(maxIdItem.item_id) : 0;
            const maxDate = lastAddedItem ? parseId(lastAddedItem.item_id) : 0;

            maxIdNum = Math.max(maxLex, maxDate);

            if (maxIdNum === 0) maxIdNum = 10000; // Default start if table is empty or parsing fails

            console.log(`Max ID found: ${maxIdNum} (Lex: ${maxLex}, Date: ${maxDate})`);

            // Parse Expiry Date (dd/mm/yyyy -> yyyy-mm-dd)
            let parsedExpiryDate = null;
            if (expiryDate) {
                const parts = expiryDate.split('/');
                if (parts.length === 3) {
                    parsedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            // 3. Retry Loop for Insertion
            let insertedItem = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (!insertedItem && attempts < maxAttempts) {
                attempts++;
                const nextId = `ITM${maxIdNum + attempts}`;

                const { data, error: insertError } = await supabase
                    .from('items')
                    .insert({
                        item_id: nextId,
                        name: name,
                        category: category || "General",
                        stock_level: quantity,
                        reorder_point: Math.round(meanReorderPoint),
                        reorder_frequency_days: Math.round(meanFrequency),
                        lead_time_days: Math.round(meanLeadTime),
                        item_popularity_score: meanPopularity,
                        unit_price: unitPrice,
                        holding_cost_per_unit_day: holdingCost,
                        handling_cost_per_unit: handlingCost,
                        last_restock_date: new Date().toISOString(),
                        date_added: new Date().toISOString(),
                        is_active: true,
                        expiry_date: parsedExpiryDate
                    })
                    .select()
                    .single();

                if (insertError) {
                    if (insertError.code === '23505') {
                        console.warn(`Duplicate ID ${nextId}, retrying...`);
                        continue;
                    } else {
                        console.error("Error inserting item:", insertError);
                        return Response.json({ error: insertError.message }, { status: 500 });
                    }
                }

                insertedItem = data;
            }

            if (!insertedItem) {
                return Response.json({ error: "Failed to generate unique ID after multiple attempts" }, { status: 500 });
            }

            return Response.json({ success: true, item: insertedItem });
        }

    } catch (err) {
        console.error("API Error:", err);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
