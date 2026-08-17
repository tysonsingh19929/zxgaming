const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const PORT = process.env.PORT || 3000;
const MAIN_SERVER_INGEST = `http://127.0.0.1:${PORT}/api/ingest/sportsbook`;

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

async function fetchSportsbookWorker(eventId, eventType = '4') {
  try {
    const form = new URLSearchParams({
      eventId: String(eventId),
      eventType: String(eventType),
      apiSiteType: '2'
    });

    const data = await safeFetchJson('querySportsBookEvent', form);
    if (!data) return;

    const sbMarketsRaw = data.sportsBookMarket || data.markets || [];
    const activeMarketsRaw = sbMarketsRaw.filter(m => m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE');

    const markets = activeMarketsRaw.map(m => {
      let specifier = {};
      try { specifier = JSON.parse(m.apiSiteSpecifier || '{}'); } catch (e) {}

      let name = m.marketName || 'Premium Sportsbook';
      if (specifier.total) {
        if (name.includes('total') && !name.includes(specifier.total)) {
          name = `${name} (${specifier.total})`;
        }
      }

      let oddsArray = [];
      try { oddsArray = JSON.parse(m.bookMode || '[]'); } catch (e) {}

      const selections = oddsArray.map((odd, i) => ({
        selectionId: `${m.id}_${i}`,
        runnerName: i === 0 ? 'Over / Yes' : 'Under / No',
        odds: parseFloat(odd) || 0,
        isActive: true
      }));

      if (selections.length === 0) {
        selections.push({
          selectionId: `${m.id}_0`,
          runnerName: 'Odds',
          odds: 1.90,
          isActive: true
        });
      }

      return {
        marketId: String(m.id || m.marketId),
        marketName: name,
        category: 'PREMIUM_SPORTSBOOK',
        status: m.marketStatus || 1,
        selections
      };
    });

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
let focusEventType = '4';

async function runSportsbookWorkerLoop() {
  while (true) {
    try {
      const focusRes = await fetch(`http://127.0.0.1:${PORT}/api/active-focus`).catch(() => null);
      if (focusRes && focusRes.ok) {
        const focusData = await focusRes.json();
        if (focusData.eventId) {
          focusEventId = focusData.eventId;
          focusEventType = focusData.eventType || '4';
        }
      }

      if (focusEventId) {
        await fetchSportsbookWorker(focusEventId, focusEventType);
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

console.log('⚡ WORKER 3: Premium Sportsbook Independent Micro-Scraper Active (apiSiteType: 2)!');
runSportsbookWorkerLoop();
