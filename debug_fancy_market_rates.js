async function debugFancyMarketRates() {
  const baseUrl = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const formFancy = new URLSearchParams({ eventId: '35916421' });
  const res = await fetch(baseUrl + 'queryFancyBetMarkets', { method: 'POST', headers, body: formFancy.toString() });
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.fancyBetMarkets || []);

  console.log(`Found ${list.length} Fancy Bet markets.`);
  const target = list.find(f => f.marketName && f.marketName.includes('6 Over ABF'));
  console.log('\n--- Raw 6 Over ABF Market Object ---');
  console.log(JSON.stringify(target, null, 2));
}

debugFancyMarketRates().catch(console.error);
