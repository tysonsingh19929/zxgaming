const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testFindSbSelections() {
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
  const keys = Object.keys(data);
  console.log('All top-level keys in querySportsBookEvent:', keys);
  
  for (const k of keys) {
    if (k.toLowerCase().includes('selection') || k.toLowerCase().includes('runner') || k.toLowerCase().includes('odd') || k.toLowerCase().includes('price') || k.toLowerCase().includes('market')) {
      console.log(`Key match "${k}": type ${typeof data[k]}, length/keys: ${Array.isArray(data[k]) ? data[k].length : (typeof data[k] === 'object' ? Object.keys(data[k]) : data[k])}`);
    }
  }
}

testFindSbSelections().catch(console.error);
