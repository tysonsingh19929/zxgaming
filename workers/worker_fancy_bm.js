const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const PORT = process.env.PORT || 3000;
const MAIN_SERVER_INGEST = `http://127.0.0.1:${PORT}/api/ingest/fancy_bm`;

const HTTP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Origin': 'https://www.skyexch.vip',
  'Referer': 'https://www.skyexch.vip/',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site'
};

async function safeFetchJson(endpoint, bodyParams) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: HTTP_HEADERS,
      body: bodyParams.toString()
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

    if (bmData === null && fancyData === null) {
      return;
    }

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
            backOdds = rawBack.filter(p => p !== '' && p !== null && !isNaN(p)).map(p => Math.round(parseFloat(p)).toString());
          } catch (e) {}

          try {
            const rawLay = JSON.parse(s.layOddsInfo || '[]');
            layOdds = rawLay.filter(p => p !== '' && p !== null && !isNaN(p)).map(p => Math.round(parseFloat(p)).toString());
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

let focusEventId = '35938017';

async function runFancyBmWorkerLoop() {
  while (true) {
    try {
      const focusRes = await fetch(`http://127.0.0.1:${PORT}/api/active-focus`).catch(() => null);
      if (focusRes && focusRes.ok) {
        const focusData = await focusRes.json();
        if (focusData.eventId) focusEventId = focusData.eventId;
      }

      if (focusEventId) {
        await fetchFancyBmWorker(focusEventId);
      }

      const activeRes = await fetch(`http://127.0.0.1:${PORT}/api/active-events`).catch(() => null);
      if (activeRes && activeRes.ok) {
        const activeData = await activeRes.json();
        const otherEvents = (activeData.events || []).filter(e => String(e.eventId) !== String(focusEventId));

        for (const ev of otherEvents.slice(0, 4)) {
          await fetchFancyBmWorker(ev.eventId);
          await new Promise(r => setTimeout(r, 60));
        }
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 80));
  }
}

console.log('⚡ WORKER 2: Priority Focused Fancy & Bookmaker Scraper Active!');
runFancyBmWorkerLoop();
