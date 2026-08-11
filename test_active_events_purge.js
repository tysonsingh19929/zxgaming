async function testActiveEventsPurge() {
  const baseUrl = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  const activeIds = new Set();
  const sports = [{ id: 4, name: 'Cricket' }, { id: 1, name: 'Soccer' }, { id: 2, name: 'Tennis' }];

  for (const s of sports) {
    const form = new URLSearchParams({
      eventType: s.id.toString(), eventTs: '-1', marketTs: '-1', selectionTs: '-1',
      viewType: 'openDateTime', competitionId: '-1', pageNumber: '1'
    });
    const res = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: form.toString() });
    const data = await res.json();
    if (data && data.events) {
      data.events.forEach(e => {
        activeIds.add(String(e.id));
        console.log(`[${s.name}] ID: ${e.id} | Name: "${e.name}" | isInPlay: ${e.isInPlay} | openDate: ${e.openDateStr || e.openDate}`);
      });
    }
  }

  console.log(`\nTotal Active Live Event IDs on SkyExchange: ${activeIds.size}`);
  console.log('Is 35916421 (Antigua v St Lucia) in active list?', activeIds.has('35916421'));
}

testActiveEventsPurge().catch(console.error);
