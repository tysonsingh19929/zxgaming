const https = require('https');

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const MAIN_SERVER_INGEST = 'http://localhost:3000/api/ingest/fancy_bm';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  maxFreeSockets: 10,
  timeout: 5000
});

const HTTP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.skyexch.vip',
  'Referer': 'https://www.skyexch.vip/',
  'Connection': 'keep-alive'
};

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

async function fetchFancyBmWorker(eventId) {
  try {
    const formBm = new URLSearchParams({ eventId: String(eventId), eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const formFancy = new URLSearchParams({ eventId: String(eventId), eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });

    const [bmData, fancyData] = await Promise.all([
      safeFetchJson('queryBookMakerMarkets', formBm),
      safeFetchJson('queryFancyBetMarkets', formFancy)
    ]);

    const markets = [];

    // 1. Bookmaker Markets
    if (bmData && bmData.bookMakerMarket && bmData.bookMakerMarket.markets) {
      const allSelections = (bmData.bookMakerSelection && bmData.bookMakerSelection.selections) ? bmData.bookMakerSelection.selections : [];

      for (const m of bmData.bookMakerMarket.markets) {
        // STRICT PURGE: Skip ended/settled/removed markets (status 3 or 9)
        if (m.status === 3 || m.status === 9 || m.isCompleted === 1) continue;
        const marketSelections = allSelections.filter(s => String(s.marketId) === String(m.marketId));
        if (marketSelections.length === 0) continue;

        const selections = marketSelections.map(s => {
          let backOdds = [];
          let layOdds = [];
          try { backOdds = JSON.parse(s.backOddsInfo || '[]').filter(p => p !== '' && p !== null && !isNaN(p)).map(Number); } catch (e) {}
          try { layOdds = JSON.parse(s.layOddsInfo || '[]').filter(p => p !== '' && p !== null && !isNaN(p)).map(Number); } catch (e) {}

          const cleanBack = (backOdds.length > 0) ? backOdds[0].toString() : null;
          const cleanLay = (layOdds.length > 0) ? layOdds[0].toString() : null;

          return {
            selectionId: String(s.selectionId),
            runnerName: s.runnerName,
            sortPriority: s.sortPriority || 0,
            backPrice: cleanBack,
            layPrice: cleanLay,
            status: s.status,
            availableToBack: backOdds.map(p => ({ price: p, size: '' })),
            availableToLay: layOdds.map(p => ({ price: p, size: '' }))
          };
        });

        markets.push({
          marketId: String(m.marketId),
          marketName: m.marketName || 'Bookmaker',
          category: 'BOOKMAKER',
          status: m.status,
          selections
        });
      }
    }

    // 2. Fancy Bet Markets
    if (fancyData) {
      const list = Array.isArray(fancyData) ? fancyData : (fancyData.fancyBetMarkets || []);
      for (const f of list) {
        // STRICT PURGE: If market is settled, resulted, closed, or status!=2, DO NOT INCLUDE
        if (f.status === 3 || f.status === 9 || f.status === 5 || (f.resultRuns !== undefined && f.resultRuns !== -1)) {
          continue;
        }

        // Purge dead ball run sessions that have ended on skyexch
        if (f.status !== 2 && (f.runsNo === 0 && f.runsYes === 0) && (f.oddsNo === null || f.oddsNo === 0 || f.oddsNo === 100)) {
          continue;
        }

        markets.push({
          marketId: String(f.marketId),
          marketName: f.marketName,
          category: 'FANCY',
          status: f.status,
          runsNo: f.runsNo,
          runsYes: f.runsYes,
          oddsNo: f.oddsNo || 100,
          oddsYes: f.oddsYes || 100,
          min: f.min,
          max: f.max
        });
      }
    }

    // Send payload (including empty list if all markets ended, which clears old markets!)
    await fetch(MAIN_SERVER_INGEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: String(eventId),
        markets
      })
    });
  } catch (e) {}
}

let currentFocusEventId = '35920148';

async function runFancyBmWorkerLoop() {
  while (true) {
    try {
      const statusRes = await fetch('http://localhost:3000/api/active-focus').catch(() => null);
      if (statusRes && statusRes.ok) {
        const focusData = await statusRes.json();
        if (focusData.eventId) currentFocusEventId = focusData.eventId;
      }

      if (currentFocusEventId) {
        await fetchFancyBmWorker(currentFocusEventId);
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 120));
  }
}

console.log('⚡ WORKER 2: Fancy Bet & Bookmaker Instant Purge Micro-Scraper Active!');
runFancyBmWorkerLoop();
