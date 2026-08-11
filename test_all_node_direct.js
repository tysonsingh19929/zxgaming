async function testAllNodeDirect() {
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

  // 2. Bookmaker
  const formBm = new URLSearchParams({ eventId });
  const resBm = await fetch(baseUrl + 'queryBookMakerMarkets', { method: 'POST', headers, body: formBm.toString() });
  const dataBm = await resBm.json();

  // 3. Fancy
  const formFancy = new URLSearchParams({ eventId });
  const resFancy = await fetch(baseUrl + 'queryFancyBetMarkets', { method: 'POST', headers, body: formFancy.toString() });
  const dataFancy = await resFancy.json();

  // 4. Premium Sportsbook
  const formSb1 = new URLSearchParams({
    eventId, apiSiteType: '2', version: '0', marketIds: ',', selectionTsList: ',', isDynamicUpdate: '0'
  });
  const resSb1 = await fetch(baseUrl + 'querySportsBookEvent', { method: 'POST', headers, body: formSb1.toString() });
  const dataSb1 = await resSb1.json();

  let dataSb2 = null;
  if (dataSb1 && dataSb1.sportsBookMarket) {
    const active = dataSb1.sportsBookMarket.filter(m => m.marketStatus === 1).slice(0, 30);
    if (active.length > 0) {
      const activeIds = active.map(m => m.id);
      const formSb2 = new URLSearchParams({
        eventId, apiSiteType: '2', version: dataSb1.eventUpdateDate || '0',
        marketIds: activeIds.join(',') + ',', selectionTsList: activeIds.map(() => '-1').join(',') + ',', isDynamicUpdate: '0'
      });
      const resSb2 = await fetch(baseUrl + 'querySportsBookEvent', { method: 'POST', headers, body: formSb2.toString() });
      dataSb2 = await resSb2.json();
    }
  }

  console.log('Match Odds Found:', Boolean(dataMo.events && dataMo.events[0].market));
  console.log('Bookmaker Found:', Boolean(dataBm && dataBm.bookMakerMarket));
  console.log('Fancy Found:', Boolean(dataFancy && Array.isArray(dataFancy)));
  console.log('Premium Sportsbook Markets:', dataSb2 ? dataSb2.sportsBookMarket.length : 0);
}

testAllNodeDirect().catch(console.error);
