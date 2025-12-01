import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import redis from "@/lib/redis";

// Simple in-memory fallback (using global to persist across hot reloads in dev)
if (!global.inventoryCache) {
    global.inventoryCache = {
        data: null,
        timestamp: 0
    };
}
let memoryCache = global.inventoryCache;

const CACHE_TTL = 300 * 1000; // 5 minutes

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 50;
        const filter = searchParams.get('filter') || 'all'; // 'all', '7d', '30d', '60d', '180d'
        const forceRefresh = searchParams.get('force_refresh') === 'true';

        // 0. Force Refresh: Clear today's predictions if requested
        if (forceRefresh) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            console.log("Force Refresh: Deleting today's predictions...");
            await supabase
                .from('predictions')
                .delete()
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString());

            // Also clear memory cache
            global.inventoryCache = { data: null, timestamp: 0 };
            memoryCache = global.inventoryCache;
        }

        // 0. Trigger Demand Update (Ensure fresh data before prediction)
        // We await this to make sure predictions use the latest demand features.
        try {
            const updateRes = await fetch(`${request.nextUrl.origin}/api/update-demand`, {
                method: 'POST',
            });
            if (!updateRes.ok) {
                console.warn("Pre-fetch demand update failed:", await updateRes.text());
            }
        } catch (e) {
            console.warn("Pre-fetch demand update error:", e.message);
        }

        let mergedData = [];
        const CACHE_KEY = 'inventory_predictions_v2';

        // 1. Try to get from Redis
        try {
            const cached = await redis.get(CACHE_KEY);
            if (cached) {
                console.log("Cache Hit: Serving from Redis");
                mergedData = JSON.parse(cached);
            }
        } catch (e) {
            // console.warn("Redis fetch failed:", e.message);
        }

        // 2. Fallback to Memory Cache if Redis failed/missed
        if (mergedData.length === 0) {
            const now = Date.now();
            if (memoryCache.data && (now - memoryCache.timestamp < CACHE_TTL)) {
                console.log("Cache Hit: Serving from Memory Fallback");
                mergedData = memoryCache.data;
            }
        }

        // 3. If still no data, fetch fresh
        if (mergedData.length === 0) {
            console.log("Cache Miss: Fetching fresh data");
            let allItems = [];
            let from = 0;
            const batchSize = 1000;

            // A. Fetch All Items
            while (true) {
                const { data: batch, error } = await supabase
                    .from("items")
                    .select("*")
                    .range(from, from + batchSize - 1);

                if (error) {
                    console.error("Supabase Error:", error);
                    return NextResponse.json(
                        { success: false, error: error.message },
                        { status: 500 }
                    );
                }

                allItems = [...allItems, ...batch];
                if (batch.length < batchSize) break;
                from += batchSize;
            }

            // B. Fetch Demand Features
            const { data: demandFeatures, error: demandError } = await supabase
                .from('demand_features')
                .select('*');

            if (!demandError && demandFeatures) {
                const demandMap = new Map(demandFeatures.map(df => [df.item_id, df]));
                allItems = allItems.map(item => {
                    const features = demandMap.get(item.item_id) || {};
                    return { ...item, ...features };
                });
            } else {
                console.warn("Could not fetch demand features:", demandError?.message);
            }

            console.log("Total fetched items:", allItems.length);

            // C. Check 'predictions' table for today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: dbPredictions, error: dbPredError } = await supabase
                .from('predictions')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString());

            let predictions = [];
            let useModel = false;

            if (dbPredError) {
                console.error("Error fetching predictions from DB:", dbPredError);
                useModel = true;
            } else if (!dbPredictions || dbPredictions.length === 0) {
                console.log("No predictions found for today. Calling model...");
                useModel = true;
            } else if (dbPredictions.length < allItems.length) {
                console.log(`Partial predictions found (${dbPredictions.length}/${allItems.length}). Calling model to fill gaps...`);
                // For simplicity, we'll rerun the model for all to ensure consistency, 
                // or we could just run for missing. Given the user prompt "if rows are null then we can call model",
                // and the batch nature, rerunning for all is safer/easier to implement reliably.
                useModel = true;
            } else {
                console.log("Using predictions from DB.");
                predictions = dbPredictions;
            }

            // D. Call Model if needed
            if (useModel) {
                const flaskRes = await fetch("http://127.0.0.1:5000/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(allItems),
                });

                if (!flaskRes.ok) {
                    console.error("Flask API Error:", await flaskRes.text());
                    // Fallback: If model fails but we had partial DB predictions, use them? 
                    // Or just fail. Let's return error to be safe.
                    return NextResponse.json(
                        { success: false, error: "Flask API request failed" },
                        { status: flaskRes.status }
                    );
                }

                predictions = await flaskRes.json();

                // E. Save to 'predictions' table
                if (predictions && predictions.length > 0) {
                    const predictionsToInsert = predictions.map((p, idx) => ({
                        item_id: p.item_id || allItems[idx].item_id,
                        pred_7d: p.pred_7d,
                        pred_30d: p.pred_30d,
                        pred_60d: p.pred_60d,
                        pred_180d: p.pred_180d,
                        days_left: p.days_left,
                        created_at: new Date().toISOString()
                    }));

                    // Use insert instead of upsert since we don't have a guaranteed unique constraint on (item_id, created_at)
                    const { error: insertError } = await supabase
                        .from('predictions')
                        .insert(predictionsToInsert);

                    if (insertError) {
                        console.error("Error saving predictions to DB:", insertError);
                    } else {
                        console.log("Predictions saved to DB.");
                    }
                }
            }

            // F. Merge Logic
            // Create a map for O(1) lookup
            let predictionMap = new Map();
            if (useModel) {
                // If came from model (index-based), we map it to item_id from allItems
                predictions.forEach((p, idx) => {
                    const itemId = p.item_id || allItems[idx].item_id;
                    predictionMap.set(itemId, p);
                });
            } else {
                // Came from DB
                dbPredictions.forEach(p => {
                    predictionMap.set(p.item_id, p);
                });
            }

            mergedData = allItems.map((item) => {
                const prediction = predictionMap.get(item.item_id) || {};

                const stock = item.stock_level !== undefined ? item.stock_level : item.stock;

                // Calculate days_left
                let dailyDemand = 0;
                if (item.daily_demand_final !== undefined && item.daily_demand_final > 0) {
                    dailyDemand = item.daily_demand_final;
                } else if (prediction.pred_30d > 0) {
                    dailyDemand = prediction.pred_30d / 30;
                }

                let daysLeft = 9999;
                if (dailyDemand > 0) {
                    daysLeft = stock / dailyDemand;
                } else if (prediction.days_left) {
                    daysLeft = prediction.days_left;
                }

                return {
                    ...item,
                    ...prediction,
                    stock: stock,
                    stock_level: stock,
                    days_left: daysLeft
                };
            });

            // Save to Redis (TTL 5 minutes)
            try {
                await redis.set(CACHE_KEY, JSON.stringify(mergedData), 'EX', 300);
            } catch (e) {
                // console.warn("Redis set failed:", e.message);
            }

            // Save to Memory Cache
            global.inventoryCache = {
                data: mergedData,
                timestamp: Date.now()
            };
            memoryCache = global.inventoryCache;
        }

        // 1. Filter
        if (filter !== 'all') {
            const key = `need_restock_${filter}`;
            mergedData = mergedData.filter(item => item[key]);
        }

        // 2. Sort (by quantity required descending)
        const sortKey = filter === 'all' ? 'restock_qty_7d' : `restock_qty_${filter}`;
        mergedData.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

        // 3. Paginate
        const totalItems = mergedData.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const paginatedData = mergedData.slice(startIndex, startIndex + limit);

        return NextResponse.json(
            {
                success: true,
                page,
                limit,
                total_items: totalItems,
                total_pages: totalPages,
                predictions: paginatedData,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Unexpected Error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
