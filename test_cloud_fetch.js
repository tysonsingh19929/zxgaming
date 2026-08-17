const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testFetch() {
  const form = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1', pageNumber: '1'
  });

  const res = await fetch(API_BASE + 'queryEventsWithMarket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Origin': 'https://www.skyexch.vip',
      'Referer': 'https://www.skyexch.vip/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    },
    body: form.toString()
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body length:', text.length);
  console.log('Body snippet:', text.slice(0, 300));
}

testFetch().catch(console.error);
