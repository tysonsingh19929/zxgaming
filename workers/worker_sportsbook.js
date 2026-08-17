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
      eventType: String(eventType)
    });

    const data = await safeFetchJson('querySportsBookEvent', form);
    if (!data || !data.markets) return;

    const markets = (data.markets || []).map(m => {
      const selections = (m.selections || []).map(s => ({
        selectionId: String(s.selectionId || s.id),
        runnerName: s.runnerName || s.name,
        odds: s.odds || s.price || 0,
        isActive: s.isActive !== false,
        isBallRunning: s.isBallRunning === true
      }));

      return {
        marketId: String(m.marketId || m.id),
        marketName: m.marketName || m.name || 'Premium Sportsbook',
        category: 'PREMIUM_SPORTSBOOK',
        status: m.status || 1,
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

console.log('⚡ WORKER 3: Premium Sportsbook Independent Micro-Scraper Active!');
runSportsbookWorkerLoop();
