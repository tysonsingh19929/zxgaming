const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testParseSportsbook3() {
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
  const activeMarkets = sbMarkets.filter(m => m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' || m.marketStatus === 4);
  console.log('Active Sportsbook Markets count:', activeMarkets.length);
  
  for (const m of sbMarkets.slice(0, 5)) {
    console.log(`Market [${m.id}] ${m.marketName} (Status: ${m.marketStatus}/${m.apiSiteStatus})`);
    console.log('   Keys:', Object.keys(m));
    if (m.sportsBookSelection || m.selections || m.runners) {
      console.log('   Selections:', (m.sportsBookSelection || m.selections || m.runners).length);
    }
  }
}

testParseSportsbook3().catch(console.error);
