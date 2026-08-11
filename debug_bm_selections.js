async function debugBmSelections() {
  const url = 'https://saapipl.skyexch.vip/exchange/member/playerService/queryBookMakerMarkets';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const res = await fetch(url, { method: 'POST', headers, body: 'eventId=35916421&eventTs=0&marketTs=0&selectionTs=0&isDynamicUpdate=1' });
  const data = await res.json();

  console.log('--- RAW queryBookMakerMarkets RESPONSE ---');
  console.log(JSON.stringify(data, null, 2));
}

debugBmSelections().catch(console.error);
