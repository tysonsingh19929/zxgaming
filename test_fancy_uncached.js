async function testFancyUncached() {
  const url = 'https://saapipl.skyexch.vip/exchange/member/playerService/queryFancyBetMarkets';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const form1 = new URLSearchParams({ eventId: '35916421' });
  const form2 = new URLSearchParams({ eventId: '35916421', eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });

  const res1 = await fetch(url, { method: 'POST', headers, body: form1.toString() });
  const data1 = await res1.json();
  const list1 = Array.isArray(data1) ? data1 : (data1.fancyBetMarkets || []);
  const sample1 = list1.find(f => f.marketName && f.marketName.includes('R Cornwall Runs'));

  const res2 = await fetch(url, { method: 'POST', headers, body: form2.toString() });
  const data2 = await res2.json();
  const list2 = Array.isArray(data2) ? data2 : (data2.fancyBetMarkets || []);
  const sample2 = list2.find(f => f.marketName && f.marketName.includes('R Cornwall Runs'));

  console.log('--- Static queryFancyBetMarkets ---');
  console.log(`R Cornwall Runs: runsNo=${sample1 ? sample1.runsNo : 'N/A'}, runsYes=${sample1 ? sample1.runsYes : 'N/A'}`);

  console.log('\n--- Dynamic (Uncached) queryFancyBetMarkets ---');
  console.log(`R Cornwall Runs: runsNo=${sample2 ? sample2.runsNo : 'N/A'}, runsYes=${sample2 ? sample2.runsYes : 'N/A'}`);
}

testFancyUncached().catch(console.error);
