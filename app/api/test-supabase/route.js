import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
    try {
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

        return NextResponse.json(
            {
                success: true,
                db_rows: allItems.length,
                prediction_rows: predictions.length,
                predictions,
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
