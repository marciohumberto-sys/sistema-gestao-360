async function test() {
    const res = await fetch("https://jfctiocmxydedvlgxdhg.supabase.co/rest/v1/commitment_movements?select=*&limit=1", {
        headers: {
            "apikey": "sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_",
            "Authorization": "Bearer sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_"
        }
    });
    const data = await res.json();
    console.log("Single full row:", data[0]);
}

test();
