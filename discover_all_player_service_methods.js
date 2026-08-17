const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function discoverAllPlayerServiceMethods() {
  const eventId = '35938017';

  // Common SkyExchange playerService method patterns
  const candidates = [
    'queryEventDetail',
    'queryEvent',
    'queryMarketDetail',
    'queryMarket',
    'querySelection',
    'querySelections',
    'querySportsBook',
    'querySportsBookAll',
    'querySportsBookData',
    'querySportsBookFeed',
    'querySportsBookLive',
    'querySportsBookRates',
    'querySportsBookFull',
    'querySportsBookDetail',
    'querySportsBookMarkets',
    'querySportsBookMarket',
    'querySportsBookEvent',
    'querySportsBookEventDetail',
    'querySportsBookEventFull',
    'querySportsBookEventMarket',
    'querySportsBookEventScore'
  ];

  for (const method of candidates) {
    try {
      const form = new URLSearchParams({ eventId, eventType: '4', apiSiteType: '2' });
      const res = await fetch(API_BASE + method, {
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
        console.log(`✅ VALID METHOD FOUND: "${method}" -> Status ${res.status}, Length: ${text.length}`);
        console.log('   Snippet:', text.slice(0, 200));
      }
    } catch (e) {}
  }
}

discoverAllPlayerServiceMethods().catch(console.error);
