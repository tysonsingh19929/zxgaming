const fs = require('fs');

async function testApi() {
  const url = 'https://bxawscf.skyexch.vip/exchange/member/playerService/queryEventsWithMarket';
  const eventId = '35871839'; // Gil Vicente v Rio Ave (Soccer match with Over/Under, Correct Score, etc.)

  const tests = [
    { name: '1. eventId_only', body: `eventId=${eventId}` },
    { name: '2. eventId_eventType', body: `eventId=${eventId}&eventType=1` },
    { name: '3. collectEventIds', body: `eventType=1&collectEventIds=${eventId}` },
    { name: '4. isHighLight_0', body: `eventType=1&collectEventIds=${eventId}&isHighLight=0` },
    { name: '5. viewType_event', body: `eventType=1&eventId=${eventId}&viewType=event` },
    { name: '6. pageNumber_0', body: `eventType=1&eventId=${eventId}&pageNumber=0` }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: t.body
      });
      const data = await res.json();
      const events = data.events || [];
      const markets = events[0]?.markets || [];
      console.log(`\n==================================================`);
      console.log(`[${t.name}] -> Return code: ${res.status} | Markets Count: ${markets.length}`);
      markets.forEach((m, idx) => {
        console.log(`   ${idx + 1}. [ID: ${m.marketId || m.id}] ${m.marketName || m.name} (type: ${m.marketType})`);
      });
    } catch (e) {
      console.log(`[${t.name}] Error:`, e.message);
    }
  }
}

testApi();
