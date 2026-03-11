async function test() {
    const res = await fetch("https://jfctiocmxydedvlgxdhg.supabase.co/rest/v1/commitment_movements?select=*&limit=3&order=created_at.desc", {
        headers: {
            "apikey": "sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_",
            "Authorization": "Bearer sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_"
        }
    });
    const data = await res.json();
    console.log("3 rows:", JSON.stringify(data, null, 2));
}

test();
