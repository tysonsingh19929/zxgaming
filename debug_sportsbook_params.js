const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function debugSportsbookParams() {
  const eventId = '35938017';
  
  for (const siteType of ['1', '2', '3', 'skyexchange', 'SKYEXCHANGE', 'allpanel777']) {
    const form = new URLSearchParams({ eventId, eventType: '4', apiSiteType: siteType });

    const res = await fetch(API_BASE + 'querySportsBookEvent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Origin': 'https://www.skyexch.vip',
        'Referer': 'https://www.skyexch.vip/'
      },
      body: form.toString()
    });

    const text = await res.text();
    console.log(`apiSiteType="${siteType}" -> Status ${res.status}, Length: ${text.length}, Snippet: ${text.slice(0, 150)}`);
  }
}

debugSportsbookParams().catch(console.error);
