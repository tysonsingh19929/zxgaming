const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testSbOddsEndpoints() {
  const eventId = '35938017';
  
  for (const ep of [
    'querySportsBookMarketOdds', 'querySportsBookRunner', 'querySportsBookRunners',
    'querySportsBookPrices', 'querySportsBookSelection', 'querySportsBookMarketDetail',
    'querySportsBookMarkets', 'querySportsBookEventMarket', 'querySportsBookOutcomes'
  ]) {
    const form = new URLSearchParams({ eventId, eventType: '4', apiSiteType: '2', marketId: '912736894' });

    const res = await fetch(API_BASE + ep, {
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
    console.log(`Endpoint "${ep}" -> Status ${res.status}, Length: ${text.length}, Snippet: ${text.slice(0, 150)}`);
  }
}

testSbOddsEndpoints().catch(console.error);
