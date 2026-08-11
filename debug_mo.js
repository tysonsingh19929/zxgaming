async function debugMo() {
  const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const formMo = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1'
  });
  const resMo = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: formMo.toString() });
  const dataMo = await resMo.json();

  const ev = (dataMo.events || []).find(e => String(e.id) === '35916421');
  console.log('Event Name:', ev ? ev.name : 'Not found');
  const rawMarkets = ev ? (ev.markets || (ev.market ? [ev.market] : [])) : [];
  console.log('Raw Markets Count:', rawMarkets.length);

  rawMarkets.forEach((m, idx) => {
    console.log(`\n--- Market #${idx + 1}: ${m.marketName} (${m.marketId || m.id}) ---`);
    (m.selections || m.runners || []).forEach(s => {
      console.log(`Runner: "${s.runnerName}" | sortPriority: ${s.sortPriority} | selectionId: ${s.selectionId}`);
      console.log('  availableToBack:', JSON.stringify(s.availableToBack));
      console.log('  availableToLay :', JSON.stringify(s.availableToLay));
    });
  });
}

debugMo().catch(console.error);
