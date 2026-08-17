const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testParseSportsbook4() {
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
  console.log('Top Keys:', Object.keys(data));
  
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k])) {
      console.log(`Array key "${k}" has length ${data[k].length}`);
      if (data[k].length > 0) {
        console.log(`   Sample [0] keys:`, Object.keys(data[k][0]));
      }
    }
  }
}

testParseSportsbook4().catch(console.error);
