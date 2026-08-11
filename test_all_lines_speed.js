async function testAllLinesSpeed() {
  const lines = [
    'https://bxawscf.skyexch.vip/exchange/member/playerService/',
    'https://bvincap.skyexch.vip/exchange/member/playerService/',
    'https://bkqawscf.skyexch.vip/exchange/member/playerService/',
    'https://bkqincap.skyexch.vip/exchange/member/playerService/',
    'https://saapipl.skyexch.vip/exchange/member/playerService/'
  ];

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

  const formBm = new URLSearchParams({ eventId: '35916421' });

  console.log('Testing speed and live odds across all 5 SkyExchange Edge Lines...');

  for (const lineUrl of lines) {
    const start = Date.now();
    try {
      const resBm = await fetch(lineUrl + 'queryBookMakerMarkets', { method: 'POST', headers, body: formBm.toString() });
      const elapsed = Date.now() - start;
      const dataBm = await resBm.json();
      const sel = (dataBm && dataBm.bookMakerSelection && dataBm.bookMakerSelection.selections) ? dataBm.bookMakerSelection.selections.find(s => s.status === 1) : null;
      let backOdds = [];
      if (sel) {
        try { backOdds = JSON.parse(sel.backOddsInfo || '[]'); } catch (e) {}
      }
      console.log(`⚡ Line: ${lineUrl}`);
      console.log(`   Response Time: ${elapsed}ms | Runner: "${sel ? sel.runnerName : 'None'}" | Back Odds: ${JSON.stringify(backOdds)}`);
    } catch (e) {
      console.log(`❌ Line: ${lineUrl} Error: ${e.message}`);
    }
  }
}

testAllLinesSpeed().catch(console.error);
