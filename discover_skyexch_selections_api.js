const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function discoverSkyexchSelectionsApi() {
  const eventId = '35938017';
  const marketId = '913264682';

  const testEndpoints = [
    'querySportsBookMarketRunner',
    'querySportsBookMarketRunners',
    'querySportsBookMarketSelection',
    'querySportsBookMarketSelections',
    'querySportsBookMarketDetail',
    'querySportsBookMarketOdds',
    'querySportsBookMarketPrices',
    'querySportsBookMarketInfo',
    'querySportsBookSelectionList',
    'querySportsBookMarketWithSelection',
    'querySportsBookMarketWithRunner',
    'querySportsBookMarketAndRunner',
    'querySportsBookEventMarket',
    'querySportsBookMarketByMarketId'
  ];

  for (const ep of testEndpoints) {
    try {
      const form = new URLSearchParams({
        eventId,
        marketId,
        eventType: '4',
        apiSiteType: '2'
      });

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
      if (!text.includes('is not supported')) {
        console.log(`🎉 SUPPORTED ENDPOINT FOUND: "${ep}" -> Status ${res.status}, Length: ${text.length}`);
        console.log('   Snippet:', text.slice(0, 300));
      } else {
        console.log(`Endpoint "${ep}" -> Not supported`);
      }
    } catch (e) {
      console.log(`Endpoint "${ep}" -> Error: ${e.message}`);
    }
  }
}

discoverSkyexchSelectionsApi().catch(console.error);
