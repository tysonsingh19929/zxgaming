async function testDynamicParams() {
  const url = 'https://saapipl.skyexch.vip/exchange/member/playerService/queryEventsWithMarket';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const paramsList = [
    { label: 'Static (-1)', form: { eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35916421' } },
    { label: 'Dynamic (Now TS)', form: { eventType: '4', eventTs: Date.now().toString(), marketTs: Date.now().toString(), selectionTs: Date.now().toString(), viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35916421', isDynamicUpdate: '1' } },
    { label: 'Dynamic (0 TS)', form: { eventType: '4', eventTs: '0', marketTs: '0', selectionTs: '0', viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35916421', isDynamicUpdate: '1' } }
  ];

  for (const item of paramsList) {
    const body = new URLSearchParams(item.form).toString();
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    const ev = (data.events || []).find(e => String(e.id) === '35916421');
    const mo = ev ? (ev.market || (ev.markets ? ev.markets[0] : null)) : null;
    const sel = mo ? mo.selections[0] : null;

    console.log(`\n--- Test: ${item.label} ---`);
    console.log(`Runner: ${sel ? sel.runnerName : 'N/A'}`);
    console.log(`Back Prices:`, sel ? JSON.stringify(sel.availableToBack) : 'N/A');
    console.log(`Lay Prices:`, sel ? JSON.stringify(sel.availableToLay) : 'N/A');
  }
}

testDynamicParams().catch(console.error);
