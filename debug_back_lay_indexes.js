async function debugBackLayIndexes() {
  const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const formMo = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35916421'
  });
  const resMo = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: formMo.toString() });
  const dataMo = await resMo.json();

  const ev = (dataMo.events || []).find(e => String(e.id) === '35916421');
  const mo = ev ? (ev.market || (ev.markets ? ev.markets[0] : null)) : null;

  console.log('--- EXACT API BACK & LAY ARRAYS ---');
  if (mo && mo.selections) {
    mo.selections.forEach(s => {
      console.log(`\nRunner: "${s.runnerName}" (sortPriority: ${s.sortPriority})`);
      console.log('  availableToBack array:', JSON.stringify(s.availableToBack, null, 2));
      console.log('  availableToLay  array:', JSON.stringify(s.availableToLay, null, 2));
    });
  }
}

debugBackLayIndexes().catch(console.error);
