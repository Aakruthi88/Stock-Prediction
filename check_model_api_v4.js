
async function checkModelApi() {
    try {
        const res = await fetch('http://localhost:3000/api/model-api?limit=10000');
        const data = await res.json();

        if (data.success) {
            console.log('Success. Total Items:', data.total_items);
            if (data.predictions.length > 0) {
                const item = data.predictions[0];
                console.log('First Item:', {
                    id: item.item_id,
                    daily_demand_final: item.daily_demand_final,
                    pred_30d: item.pred_30d,
                    days_left: item.days_left
                });
            }
        } else {
            console.error('API Error:', data.error);
        }
    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
}

checkModelApi();
