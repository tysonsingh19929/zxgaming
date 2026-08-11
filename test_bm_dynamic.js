async function testBmDynamic() {
  const url = 'https://saapipl.skyexch.vip/exchange/member/playerService/queryBookMakerMarkets';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const paramsList = [
    { label: 'Static (-1)', form: { eventId: '35916421', eventTs: '-1', marketTs: '-1', selectionTs: '-1' } },
    { label: 'Dynamic (0 TS)', form: { eventId: '35916421', eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' } }
  ];

  for (const item of paramsList) {
    const body = new URLSearchParams(item.form).toString();
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    const sel = (data.bookMakerSelection && data.bookMakerSelection.selections) ? data.bookMakerSelection.selections.find(s => s.status === 1) : null;
    let backOdds = [];
    let layOdds = [];
    if (sel) {
      try { backOdds = JSON.parse(sel.backOddsInfo || '[]'); } catch (e) {}
      try { layOdds = JSON.parse(sel.layOddsInfo || '[]'); } catch (e) {}
    }

    console.log(`\n--- Test Bookmaker: ${item.label} ---`);
    console.log(`Runner: ${sel ? sel.runnerName : 'N/A'}`);
    console.log(`Back Odds:`, JSON.stringify(backOdds));
    console.log(`Lay Odds:`, JSON.stringify(layOdds));
  }
}

testBmDynamic().catch(console.error);
