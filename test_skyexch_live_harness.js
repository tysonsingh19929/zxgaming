const https = require('https');

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const HTTP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.skyexch.vip',
  'Referer': 'https://www.skyexch.vip/',
  'Connection': 'keep-alive'
};
const httpsAgent = new https.Agent({ keepAlive: true });

async function safeFetchJson(endpoint, bodyParams) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: HTTP_HEADERS,
      body: bodyParams.toString(),
      agent: httpsAgent
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.includes('<!DOCTYPE')) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function runLiveHarnessTest() {
  console.log('======================================================');
  console.log('🧪 LIVE AUTOMATED SKYEXCH.VIP VS LOCALHOST PARITY TEST');
  console.log('======================================================\n');

  // 1. Fetch active events from skyexch
  const formEv = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1', pageNumber: '1'
  });
  const skyEvData = await safeFetchJson('queryEventsWithMarket', formEv);
  if (!skyEvData || !skyEvData.events) {
    console.error('❌ Failed to fetch events from SkyExchange.');
    return;
  }

  const liveMatches = skyEvData.events.filter(e => e.isInPlay === 1);
  console.log(`📡 SkyExchange In-Play Matches Count: ${liveMatches.length}`);

  for (const targetEv of liveMatches.slice(0, 3)) {
    const eventId = String(targetEv.id);
    console.log(`\n------------------------------------------------------`);
    console.log(`🏏 MATCH: "${targetEv.name}" (ID: ${eventId})`);

    // Fetch local API detail
    const localRes = await fetch(`http://localhost:3000/api/event/${eventId}`).catch(() => null);
    if (!localRes || !localRes.ok) {
      console.log(`❌ Local server port 3000 has no data for event ${eventId}`);
      continue;
    }
    const localData = await localRes.json();
    const localMarkets = localData.event ? (localData.event.markets || []) : [];

    // --- A. MATCH ODDS COMPARISON ---
    const formMo = new URLSearchParams({
      eventType: '4', eventTs: '0', marketTs: '0', selectionTs: '0',
      isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: eventId
    });
    const skyMoData = await safeFetchJson('queryEventsWithMarket', formMo);
    let skyMoRunners = [];
    if (skyMoData && skyMoData.events && skyMoData.events.length > 0) {
      const m = skyMoData.events[0].market || (skyMoData.events[0].markets ? skyMoData.events[0].markets[0] : null);
      if (m) skyMoRunners = m.selections || m.runners || [];
    }

    // Sort SkyExchange Match Odds runners by sortPriority / selectionId
    skyMoRunners.sort((a, b) => (a.sortPriority || a.sortOrder || 0) - (b.sortPriority || b.sortOrder || 0));

    const localMo = localMarkets.find(m => m.category === 'MATCH_ODDS');
    const localMoRunners = localMo ? (localMo.selections || []) : [];

    console.log(`\n  📈 [MATCH ODDS RUNNER ORDER CHECK]`);
    console.log(`     SkyExchange Order: [${skyMoRunners.map(r => r.runnerName || r.name).join(', ')}]`);
    console.log(`     Localhost   Order: [${localMoRunners.map(r => r.runnerName).join(', ')}]`);

    let moMatch = true;
    for (let i = 0; i < Math.min(skyMoRunners.length, localMoRunners.length); i++) {
      const skyName = skyMoRunners[i].runnerName || skyMoRunners[i].name;
      const localName = localMoRunners[i].runnerName;
      if (skyName !== localName) moMatch = false;
    }
    console.log(`     Status: ${moMatch ? '✅ MATCH ODDS ORDER PERFECT' : '❌ MATCH ODDS ORDER MISMATCH!'}`);

    // --- B. BOOKMAKER COMPARISON ---
    const formBm = new URLSearchParams({ eventId, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const skyBm = await safeFetchJson('queryBookMakerMarkets', formBm);
    let skyBmSelections = [];
    if (skyBm && skyBm.bookMakerSelection && skyBm.bookMakerSelection.selections) {
      skyBmSelections = skyBm.bookMakerSelection.selections;
    }

    const localBm = localMarkets.find(m => m.category === 'BOOKMAKER');
    const localBmSelections = localBm ? (localBm.selections || []) : [];

    console.log(`\n  📚 [BOOKMAKER RATES CHECK]`);
    skyBmSelections.forEach(s => {
      let bArr = [], lArr = [];
      try { bArr = JSON.parse(s.backOddsInfo || '[]'); } catch (e) {}
      try { lArr = JSON.parse(s.layOddsInfo || '[]'); } catch (e) {}
      console.log(`     SkyExch BM Runner: "${s.runnerName}" | BackRaw: ${bArr[0] || '-'} | LayRaw: ${lArr[0] || '-'} | Status: ${s.status}`);
    });

    localBmSelections.forEach(s => {
      const bPrice = s.availableToBack && s.availableToBack[0] ? s.availableToBack[0].price : s.backPrice;
      const lPrice = s.availableToLay && s.availableToLay[0] ? s.availableToLay[0].price : s.layPrice;
      console.log(`     Localhost BM Runner: "${s.runnerName}" | Back: ${bPrice || '-'} | Lay: ${lPrice || '-'} | Status: ${s.status}`);
    });

    // --- C. FANCY BET COMPARISON ---
    const formFancy = new URLSearchParams({ eventId, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const skyFancy = await safeFetchJson('queryFancyBetMarkets', formFancy);
    const skyFancyList = Array.isArray(skyFancy) ? skyFancy : (skyFancy ? skyFancy.fancyBetMarkets || [] : []);

    const localFancyList = localMarkets.filter(m => m.category === 'FANCY');

    console.log(`\n  ⭐ [FANCY BET SESSIONS CHECK]`);
    console.log(`     SkyExchange Fancy Count: ${skyFancyList.length} | Localhost Fancy Count: ${localFancyList.length}`);

    skyFancyList.slice(0, 3).forEach(f => {
      const matchingLocal = localFancyList.find(l => String(l.marketId) === String(f.marketId) || l.marketName === f.marketName);
      console.log(`     Fancy: "${f.marketName}"`);
      console.log(`       SkyExch  -> Status: ${f.status} | Runs: ${f.runsNo}/${f.runsYes} | Odds: ${f.oddsNo}/${f.oddsYes}`);
      if (matchingLocal) {
        console.log(`       Localhost -> Status: ${matchingLocal.status} | Runs: ${matchingLocal.runsNo}/${matchingLocal.runsYes} | Odds: ${matchingLocal.oddsNo}/${matchingLocal.oddsYes}`);
      } else {
        console.log(`       Localhost -> ❌ MISSING FROM LOCAL API`);
      }
    });
  }

  console.log('\n======================================================');
  console.log('✅ COMPLETED HARNESS AUDIT');
  console.log('======================================================');
}

runLiveHarnessTest().catch(console.error);
