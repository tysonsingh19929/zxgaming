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
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function inspectMoBmFancyDeep() {
  console.log('======================================================');
  console.log('🔬 DEEP INSPECTION: MATCH ODDS, BOOKMAKER & FANCY BETS');
  console.log('======================================================\n');

  // 1. Fetch active events
  const formMoEvents = new URLSearchParams({
    eventType: '4', eventTs: '-1', marketTs: '-1', selectionTs: '-1',
    viewType: 'openDateTime', competitionId: '-1', pageNumber: '1'
  });

  const eventsData = await safeFetchJson('queryEventsWithMarket', formMoEvents);
  if (!eventsData || !eventsData.events) {
    console.error('Failed to fetch events from SkyExchange.');
    return;
  }

  const liveMatches = eventsData.events.filter(e => e.isInPlay === 1);
  console.log(`📡 Total In-Play Matches found: ${liveMatches.length}`);

  for (const ev of liveMatches) {
    const eventId = String(ev.id);
    console.log(`\n------------------------------------------------------`);
    console.log(`🏏 MATCH: ${ev.name} (ID: ${eventId})`);
    console.log(`   InPlay: ${ev.isInPlay} | Has BM: ${ev.hasBookMakerMarkets} | Has Fancy: ${ev.hasFancyBetMarkets}`);

    // Query Match Odds
    const formMo = new URLSearchParams({
      eventType: '4', eventTs: '0', marketTs: '0', selectionTs: '0',
      isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: eventId
    });
    const moData = await safeFetchJson('queryEventsWithMarket', formMo);
    if (moData && moData.events && moData.events.length > 0) {
      const moEv = moData.events[0];
      const m = moEv.market || (moEv.markets ? moEv.markets[0] : null);
      if (m) {
        console.log(`\n  📈 [MATCH ODDS] Market: "${m.marketName || m.name}" (Status: ${m.status})`);
        const runners = m.selections || m.runners || [];
        runners.forEach(s => {
          const back = s.availableToBack ? s.availableToBack.map(b => `${b.price} ($${b.size})`).join(', ') : 'None';
          const lay = s.availableToLay ? s.availableToLay.map(l => `${l.price} ($${l.size})`).join(', ') : 'None';
          console.log(`     Runner: ${s.runnerName || s.name} | Back: [${back}] | Lay: [${lay}]`);
        });
      }
    }

    // Query Bookmaker
    const formBm = new URLSearchParams({ eventId, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const bmData = await safeFetchJson('queryBookMakerMarkets', formBm);
    if (bmData && bmData.bookMakerMarket && bmData.bookMakerMarket.markets) {
      console.log(`\n  📚 [BOOKMAKER] Markets count: ${bmData.bookMakerMarket.markets.length}`);
      const selections = (bmData.bookMakerSelection && bmData.bookMakerSelection.selections) ? bmData.bookMakerSelection.selections : [];

      bmData.bookMakerMarket.markets.forEach(m => {
        console.log(`     Market: "${m.marketName}" (ID: ${m.marketId}, Status: ${m.status})`);
        const mSel = selections.filter(s => String(s.marketId) === String(m.marketId));
        mSel.forEach(s => {
          console.log(`       Selection: "${s.runnerName}" | BackRaw: ${s.backOddsInfo} | LayRaw: ${s.layOddsInfo} | Status: ${s.status}`);
        });
      });
    }

    // Query Fancy Bets
    const formFancy = new URLSearchParams({ eventId, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const fancyData = await safeFetchJson('queryFancyBetMarkets', formFancy);
    if (fancyData) {
      const list = Array.isArray(fancyData) ? fancyData : (fancyData.fancyBetMarkets || []);
      console.log(`\n  ⭐ [FANCY BETS] Active Fancy Markets count: ${list.length}`);
      list.slice(0, 5).forEach(f => {
        console.log(`     Fancy: "${f.marketName}" (ID: ${f.marketId}) | Status: ${f.status} | RunsNo: ${f.runsNo} | RunsYes: ${f.runsYes} | OddsNo: ${f.oddsNo} | OddsYes: ${f.oddsYes} | ResultRuns: ${f.resultRuns}`);
      });
    }
  }

  console.log('\n======================================================');
  console.log('✅ DEEP INSPECTION COMPLETED');
  console.log('======================================================');
}

inspectMoBmFancyDeep().catch(console.error);
