
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { CloudCog } from 'lucide-react';

export async function GET() {
    try {
        // Attempt to fetch a single row from a non-existent table just to check connection
        // or use a lightweight query. 
        // Since we don't know the schema, we'll try to get the server health or just a simple query.
        // A query to a non-existent table will return a 404-like error from PostgREST, 
        // which implies the connection to Supabase is working.

        const { data, error } = await supabase.from('items').select('*').limit(5);

        console.log(data);

        // If we get a specific error code like 'PGRST200' (table not found), 
        // it means we successfully talked to the database.
        // If we get a network error, then connection failed.

        if (error && error.code !== 'PGRST200' && error.code !== '42P01') {
            // 42P01 is PostgreSQL error for undefined table
            console.error('Supabase connection error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Connection to Supabase successful!' }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
