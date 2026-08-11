async function findActiveFancyNow() {
  const url = 'https://saapipl.skyexch.vip/exchange/member/playerService/queryFancyBetMarkets';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const res = await fetch(url, { method: 'POST', headers, body: 'eventId=35916421&eventTs=0&marketTs=0&selectionTs=0&isDynamicUpdate=1' });
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.fancyBetMarkets || []);

  console.log(`Total Fancy markets: ${list.length}`);
  const active = list.filter(f => f.status === 2 || f.status === 1);
  console.log(`Active / Open markets count: ${active.length}`);

  active.slice(0, 30).forEach(f => {
    console.log(`- ID: ${f.marketId} | Name: "${f.marketName}" | status: ${f.status} | No: ${f.runsNo} (${f.oddsNo}) | Yes: ${f.runsYes} (${f.oddsYes})`);
  });
}

findActiveFancyNow().catch(console.error);
