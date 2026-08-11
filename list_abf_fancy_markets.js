async function listAbfFancyMarkets() {
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

  const abfList = list.filter(f => f.marketName && f.marketName.includes('ABF'));
  console.log(`Found ${abfList.length} ABF markets:`);
  abfList.forEach(f => {
    console.log(`- ID: ${f.marketId} | Name: "${f.marketName}" | status: ${f.status} | runsNo: ${f.runsNo} | runsYes: ${f.runsYes} | oddsNo: ${f.oddsNo} | oddsYes: ${f.oddsYes}`);
  });
}

listAbfFancyMarkets().catch(console.error);
