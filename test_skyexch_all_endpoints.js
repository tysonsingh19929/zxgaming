const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testSkyexchAllEndpoints() {
  const eventId = '35938017';
  
  const endpoints = [
    'querySportsBookMarketWithSelection',
    'querySportsBookEventSelections',
    'querySportsBookOddsList',
    'querySportsBookMarketSelectionOdds',
    'querySportsBookSelectionOdds',
    'querySportsBookMarketSelections',
    'querySportsBookMarketRunners',
    'querySportsBookMarketOutcome',
    'querySportsBookOutcomes',
    'querySportsBookMarketPrice',
    'querySportsBookPrices',
    'querySportsBookMarketRates',
    'querySportsBookEventOdds'
  ];

  for (const ep of endpoints) {
    const form = new URLSearchParams({ eventId, eventType: '4', apiSiteType: '2', isDynamicUpdate: '1' });

    try {
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
    } catch (e) {
      console.log(`Endpoint "${ep}" -> Error: ${e.message}`);
    }
  }
}

testSkyexchAllEndpoints().catch(console.error);
