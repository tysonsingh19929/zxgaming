async function debugRunnerOrder() {
  const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const eventId = '35916421';

  // 1. Match Odds
  const formMo = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1', collectEventIds: eventId
  });
  const resMo = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: formMo.toString() });
  const dataMo = await resMo.json();

  const ev = (dataMo.events || []).find(e => String(e.id) === eventId);
  const moMarket = ev ? ev.market : null;

  console.log('--- MATCH ODDS RUNNERS ---');
  if (moMarket && moMarket.selections) {
    moMarket.selections.forEach(s => {
      console.log(`Runner: "${s.runnerName}" | sortPriority: ${s.sortPriority} | selectionId: ${s.selectionId}`);
      console.log('  Back:', JSON.stringify(s.availableToBack));
      console.log('  Lay :', JSON.stringify(s.availableToLay));
    });
  }

  // 2. Bookmaker
  const formBm = new URLSearchParams({ eventId });
  const resBm = await fetch(baseUrl + 'queryBookMakerMarkets', { method: 'POST', headers, body: formBm.toString() });
  const dataBm = await resBm.json();

  console.log('\n--- BOOKMAKER SELECTIONS ---');
  if (dataBm && dataBm.bookMakerSelection && dataBm.bookMakerSelection.selections) {
    dataBm.bookMakerSelection.selections.forEach(s => {
      console.log(`Runner: "${s.runnerName}" | sortPriority: ${s.sortPriority} | status: ${s.status}`);
      console.log('  backOddsInfo:', s.backOddsInfo);
      console.log('  layOddsInfo :', s.layOddsInfo);
    });
  }
}

debugRunnerOrder().catch(console.error);
