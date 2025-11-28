import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// This API calculates demand metrics from sales_history and updates demand_features
export async function POST(request) {
    try {
        // 1. Fetch all items to ensure we update even those with 0 sales
        // We fetch all columns to ensure we can satisfy NOT NULL constraints during upsert
        const { data: allItems, error: itemsError } = await supabase
            .from('items')
            .select('*');

        if (itemsError) throw itemsError;

        // 2. Fetch sales history for the last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const dateStr = sixtyDaysAgo.toISOString().split('T')[0];

        const { data: salesData, error: salesError } = await supabase
            .from('sales_history')
            .select('item_id, date, qty_sold')
            .gte('date', dateStr)
            .order('date', { ascending: true });

        if (salesError) throw salesError;

        // 3. Group sales by Item ID
        const salesByItem = {};
        // Initialize for all items
        allItems.forEach(item => {
            salesByItem[item.item_id] = [];
        });
        // Fill with actual sales
        salesData.forEach(record => {
            if (salesByItem[record.item_id]) {
                salesByItem[record.item_id].push(record);
            }
        });

        // 4. Calculate Metrics for each item
        const updates = [];
        const now = new Date();

        for (const itemId in salesByItem) {
            const history = salesByItem[itemId];

            // Helper to sum quantity in a date range
            const sumQty = (days) => {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                const cutoffStr = cutoff.toISOString().split('T')[0];

                return history
                    .filter(r => r.date >= cutoffStr)
                    .reduce((sum, r) => sum + r.qty_sold, 0);
            };

            const rolling7d = sumQty(7);
            const rolling30d = sumQty(30);
            const rolling60d = sumQty(60);

            // Daily Demand Final (Priority: 30d -> 7d -> 0)
            let daily_demand_final = 0;
            if (rolling30d > 0) {
                daily_demand_final = rolling30d / 30;
            } else if (rolling7d > 0) {
                daily_demand_final = rolling7d / 7;
            }

            // Standard Deviation (over last 30 days)
            let sumSqDiff = 0;
            const daysMap = {};
            history.forEach(r => daysMap[r.date] = r.qty_sold);

            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const qty = daysMap[dStr] || 0;
                sumSqDiff += Math.pow(qty - daily_demand_final, 2);
            }
            const demand_std_dev = Math.sqrt(sumSqDiff / 30);

            updates.push({
                item_id: itemId,
                daily_demand_final,
                demand_std_dev,
                rolling_7d: rolling7d,
                rolling_30d: rolling30d,
                rolling_60d: rolling60d,
                updated_at: now.toISOString()
            });
        }

        // 5. Upsert into demand_features
        if (updates.length > 0) {
            const { error: upsertError } = await supabase
                .from('demand_features')
                .upsert(updates, { onConflict: 'item_id' });

            if (upsertError) throw upsertError;

            // 6. Update 'item_popularity_score' in 'items' table
            // Normalize score between 0 and 1
            const maxDemand = Math.max(...updates.map(u => u.daily_demand_final), 1); // Avoid div by 0

            // Calculate Mean Popularity Score for new entries
            const validScores = allItems
                .map(i => i.item_popularity_score)
                .filter(s => s !== null && s !== undefined);
            const globalMeanScore = validScores.length > 0
                ? validScores.reduce((a, b) => a + b, 0) / validScores.length
                : 0.5; // Default if no data at all

            const itemUpdates = updates.map(u => {
                const originalItem = allItems.find(i => i.item_id === u.item_id);
                let newScore = originalItem.item_popularity_score;

                // Update Logic:
                // 1. If we have 30d or 7d data, calculate new score
                // 2. If no data (rolling_30d == 0 AND rolling_7d == 0):
                //    - If new entry (score is null), set to global mean
                //    - If existing entry, keep current score

                if (u.rolling_30d > 0 || u.rolling_7d > 0) {
                    newScore = u.daily_demand_final / maxDemand;
                } else {
                    // No recent data
                    if (newScore === null || newScore === undefined) {
                        newScore = globalMeanScore;
                    }
                }

                return {
                    ...originalItem,
                    item_popularity_score: newScore
                };
            });

            const { error: itemsUpdateError } = await supabase
                .from('items')
                .upsert(itemUpdates, { onConflict: 'item_id' });

            if (itemsUpdateError) {
                console.warn("Failed to update items table demand:", itemsUpdateError.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated demand features and items for ${updates.length} items.`
        });

    } catch (err) {
        console.error("Demand Update Error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
