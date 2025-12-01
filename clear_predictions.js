import { supabase } from '@/lib/supabaseClient';

async function clearPredictions() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { error } = await supabase
        .from('predictions')
        .delete()
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

    if (error) {
        console.error("Error deleting predictions:", error);
    } else {
        console.log("Successfully deleted today's predictions.");
    }
}

clearPredictions();
