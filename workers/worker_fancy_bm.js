const https = require('https');

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const MAIN_SERVER_INGEST = 'http://localhost:3000/api/ingest/fancy_bm';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 30,
  maxFreeSockets: 15,
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
        if (m.status === 3 || m.status === 9 || m.isCompleted === 1) continue;
        const marketSelections = allSelections.filter(s => String(s.marketId) === String(m.marketId));
        if (marketSelections.length === 0) continue;

        marketSelections.sort((a, b) => {
          const prioA = a.sortPriority !== undefined ? a.sortPriority : (parseInt(a.selectionId) || 0);
          const prioB = b.sortPriority !== undefined ? b.sortPriority : (parseInt(b.selectionId) || 0);
          return prioA - prioB;
        });

        const selections = marketSelections.map(s => {
          let backOdds = [];
          let layOdds = [];
          try {
            const rawBack = JSON.parse(s.backOddsInfo || '[]');
            backOdds = rawBack.filter(p => p !== '' && p !== null && !isNaN(p)).map(p => parseFloat(p).toFixed(0));
          } catch (e) {}

          try {
            const rawLay = JSON.parse(s.layOddsInfo || '[]');
            layOdds = rawLay.filter(p => p !== '' && p !== null && !isNaN(p)).map(p => parseFloat(p).toFixed(0));
          } catch (e) {}

          return {
            selectionId: String(s.selectionId),
            runnerName: s.runnerName,
            sortPriority: s.sortPriority || 0,
            status: s.status,
            backPrice: backOdds[0] || null,
            layPrice: layOdds[0] || null,
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
        if (f.status === 3 || f.status === 9 || f.status === 5 || (f.resultRuns !== undefined && f.resultRuns !== -1)) {
          continue;
        }

        const name = (f.marketName || '').trim();
        if (name.startsWith('<') || name === 'h' || name.includes('/\'/') || name.length <= 1) {
          continue;
        }

        if (f.status === 1 && (f.runsNo === 0 && f.runsYes === 0) && (f.oddsNo === null || f.oddsNo === 0)) {
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

async function runFancyBmWorkerLoop() {
  while (true) {
    try {
      const activeRes = await fetch('http://localhost:3000/api/active-events').catch(() => null);
      if (activeRes && activeRes.ok) {
        const activeData = await activeRes.json();
        const liveList = activeData.events || [];

        // Scrape all live matches concurrently
        await Promise.all(liveList.map(ev => fetchFancyBmWorker(ev.eventId)));
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

console.log('⚡ WORKER 2: Multi-Match Parallel Fancy & Bookmaker Scraper Active!');
runFancyBmWorkerLoop();
