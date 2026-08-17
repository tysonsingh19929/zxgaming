const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function inspectSportsbookRaw() {
  const form = new URLSearchParams({ eventId: '35938017', eventType: '4', apiSiteType: '2' });

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

  const data = await res.json();
  const sbMarkets = data.sportsBookMarket || [];
  
  // Find the exact market shown in user's screenshot: "1st innings over 14 - Barbados Tridents run range"
  const targetM = sbMarkets.find(m => m.marketName && m.marketName.includes('1st innings over 14 - Barbados Tridents run range'));
  
  if (targetM) {
    console.log('Found Target Market object:');
    console.log(JSON.stringify(targetM, null, 2));
  } else {
    console.log('Target market not found in current payload, searching all active markets with "run range":');
    const rrMarkets = sbMarkets.filter(m => m.marketName && m.marketName.includes('run range'));
    rrMarkets.forEach(m => console.log(JSON.stringify(m, null, 2)));
  }
}

inspectSportsbookRaw().catch(console.error);
