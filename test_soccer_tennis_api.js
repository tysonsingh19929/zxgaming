async function testSoccerTennisApi() {
  const baseUrl = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.skyexch.vip',
    'Referer': 'https://www.skyexch.vip/'
  };

  // Test Soccer match (e.g. 35906177)
  const soccerForm = new URLSearchParams({
    eventType: '1', eventTs: '0', marketTs: '0', selectionTs: '0',
    isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35906177'
  });
  const res1 = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: soccerForm.toString() });
  const data1 = await res1.json();

  console.log('--- SOCCER API RESPONSE (eventType: 1) ---');
  if (data1 && data1.events && data1.events.length > 0) {
    const ev = data1.events[0];
    console.log(`Event Name: ${ev.name} | Markets Count: ${ev.markets ? ev.markets.length : 0}`);
    if (ev.market) console.log(`Main Market: ${ev.market.marketName} | Selections: ${ev.market.selections ? ev.market.selections.length : 0}`);
  } else {
    console.log('No Soccer event found!');
  }

  // Test Tennis match (e.g. 35922093)
  const tennisForm = new URLSearchParams({
    eventType: '2', eventTs: '0', marketTs: '0', selectionTs: '0',
    isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: '35922093'
  });
  const res2 = await fetch(baseUrl + 'queryEventsWithMarket', { method: 'POST', headers, body: tennisForm.toString() });
  const data2 = await res2.json();

  console.log('\n--- TENNIS API RESPONSE (eventType: 2) ---');
  if (data2 && data2.events && data2.events.length > 0) {
    const ev = data2.events[0];
    console.log(`Event Name: ${ev.name} | Markets Count: ${ev.markets ? ev.markets.length : 0}`);
    if (ev.market) console.log(`Main Market: ${ev.market.marketName} | Selections: ${ev.market.selections ? ev.market.selections.length : 0}`);
  } else {
    console.log('No Tennis event found!');
  }
}

testSoccerTennisApi().catch(console.error);
