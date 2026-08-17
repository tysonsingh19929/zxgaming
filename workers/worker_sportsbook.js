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

function expandMarketRunners(m) {
  let specifier = {};
  try { specifier = JSON.parse(m.apiSiteSpecifier || '{}'); } catch (e) {}

  const name = m.marketName || '';

  // 1. Run Range Markets (e.g. "1st innings over 14 - Barbados Tridents run range")
  if (name.includes('run range') || (specifier.variant && specifier.variant.includes('run_range'))) {
    const ranges = ['0-3', '4', '5', '6', '7', '8', '9', '10', '11', '12+'];
    const odds = [8.4, 12.5, 10.0, 9.2, 8.8, 8.8, 9.0, 9.8, 11.0, 2.44];
    return ranges.map((r, i) => ({
      selectionId: `${m.id}_${i}`,
      runnerName: r,
      odds: odds[i] || 9.0,
      isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE'
    }));
  }

  // 2. Over / Under Total Markets (e.g. "1st innings over 13 - Barbados Tridents total")
  if (name.includes('total') && specifier.total) {
    return [
      { selectionId: `${m.id}_0`, runnerName: `over ${specifier.total}`, odds: 1.94, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' },
      { selectionId: `${m.id}_1`, runnerName: `under ${specifier.total}`, odds: 1.77, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' }
    ];
  }

  // 3. Both Teams to Score / Yes/No Markets
  if (name.includes('Both teams to score') || name.includes('Will there be a tie') || name.includes('to be a wicket')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Yes', odds: 6.00, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' },
      { selectionId: `${m.id}_1`, runnerName: 'No', odds: 1.15, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' }
    ];
  }

  // 4. Default 2-runner market
  return [
    { selectionId: `${m.id}_0`, runnerName: 'Over / Yes', odds: 1.85, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' },
    { selectionId: `${m.id}_1`, runnerName: 'Under / No', odds: 1.85, isActive: m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE' }
  ];
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
      if (specifier.total && name.includes('total') && !name.includes(specifier.total)) {
        name = `${name} (${specifier.total})`;
      }

      const selections = expandMarketRunners(m);

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

console.log('⚡ WORKER 3: Premium Sportsbook Independent Micro-Scraper Active (SkyExchange Structured)!');
runSportsbookWorkerLoop();
