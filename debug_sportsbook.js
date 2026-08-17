const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function debugSportsbook() {
  const eventId = '35938017';
  const form = new URLSearchParams({ eventId, eventType: '4' });

  const res = await fetch(API_BASE + 'querySportsBookEvent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Origin': 'https://www.skyexch.vip',
      'Referer': 'https://www.skyexch.vip/',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    },
    body: form.toString()
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body length:', text.length);
  console.log('Body snippet:', text.slice(0, 800));
}

debugSportsbook().catch(console.error);
