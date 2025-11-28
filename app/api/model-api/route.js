import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import redis from "@/lib/redis";

// Simple in-memory fallback
let memoryCache = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 300 * 1000; // 5 minutes

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 50;
        const filter = searchParams.get('filter') || 'all'; // 'all', '7d', '30d', '60d', '180d'

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
        const CACHE_KEY = 'inventory_predictions_full';

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

            console.log("Total fetched items:", allItems.length);

            // Send to Flask API
            const flaskRes = await fetch("http://127.0.0.1:5000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(allItems),
            });

            if (!flaskRes.ok) {
                console.error("Flask API Error:", await flaskRes.text());
                return NextResponse.json(
                    { success: false, error: "Flask API request failed" },
                    { status: flaskRes.status }
                );
            }

            const predictions = await flaskRes.json();

            // Merge predictions with original item data
            mergedData = allItems.map((item, index) => ({
                ...item,
                ...predictions[index]
            }));

            // Save to Redis (TTL 5 minutes)
            try {
                await redis.set(CACHE_KEY, JSON.stringify(mergedData), 'EX', 300);
            } catch (e) {
                // console.warn("Redis set failed:", e.message);
            }

            // Save to Memory Cache
            memoryCache = {
                data: mergedData,
                timestamp: Date.now()
            };
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
