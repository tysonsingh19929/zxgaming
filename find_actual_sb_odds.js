const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function findActualSbOdds() {
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
  
  // Print ALL top level keys in data
  console.log('Top Level Keys:', Object.keys(data));
  
  // Search every single key in data for array of selections or market odds
  for (const k of Object.keys(data)) {
    if (k.toLowerCase().includes('selection') || k.toLowerCase().includes('odd') || k.toLowerCase().includes('runner') || k.toLowerCase().includes('price')) {
      console.log(`Matching top-level key "${k}":`, JSON.stringify(data[k]).slice(0, 300));
    }
  }

  // Inspect the first active market in sportsBookMarket
  const sbMarkets = data.sportsBookMarket || [];
  for (const m of sbMarkets) {
    if (m.marketName && m.marketName.includes('1st innings over 13 - Barbados Tridents total')) {
      console.log('\nTarget Market Full Object:');
      console.log(JSON.stringify(m, null, 2));
      break;
    }
  }
}

findActualSbOdds().catch(console.error);
