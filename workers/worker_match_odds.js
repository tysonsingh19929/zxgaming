const https = require('https');

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const MAIN_SERVER_INGEST = 'http://localhost:3000/api/ingest/match_odds';

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

async function fetchMatchOddsWorker(eventId, eventType = '4') {
  try {
    const formMo = new URLSearchParams({
      eventType: String(eventType), eventTs: '0', marketTs: '0', selectionTs: '0',
      isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: String(eventId)
    });

    const res = await fetch(API_BASE + 'queryEventsWithMarket', {
      method: 'POST',
      headers: HTTP_HEADERS,
      body: formMo.toString(),
      agent: httpsAgent
    });

    if (!res.ok) return;
    const text = await res.text();
    if (!text || text.includes('<!DOCTYPE')) return;
    const data = JSON.parse(text);

    if (data && data.events && data.events.length > 0) {
      const ev = data.events.find(e => String(e.id) === String(eventId)) || data.events[0];
      
      const rawMarkets = [];
      if (ev.market) rawMarkets.push(ev.market);
      if (ev.markets && Array.isArray(ev.markets)) rawMarkets.push(...ev.markets);

      const markets = [];
      for (const m of rawMarkets) {
        if (m.status === 3 || m.status === 9) continue;
        const selections = (m.selections || m.runners || []).map(s => ({
          selectionId: String(s.selectionId || s.id),
          runnerName: s.runnerName || s.name || 'Runner',
          sortPriority: s.sortPriority || 0,
          availableToBack: s.availableToBack || [],
          availableToLay: s.availableToLay || []
        }));

        markets.push({
          marketId: String(m.id || m.marketId),
          marketName: m.marketName || m.name || 'Match Odds',
          category: 'MATCH_ODDS',
          status: m.status,
          selections
        });
      }

      // Send ingested payload to central API server
      await fetch(MAIN_SERVER_INGEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: String(eventId),
          eventType: ev.eventType || eventType,
          eventName: ev.name,
          competitionName: ev.competitionName,
          openDateStr: ev.openDateStr || ev.openDate,
          isInPlay: ev.isInPlay === 1,
          scores: ev.scores ? (typeof ev.scores === 'string' ? JSON.parse(ev.scores) : ev.scores) : null,
          markets
        })
      });
    }
  } catch (e) {
    // Isolated error handling
  }
}

// Continuous ultra-fast Match Odds loop (~50ms)
let currentFocusEventId = '35913231';
let currentEventType = '4';

async function runMatchOddsWorkerLoop() {
  while (true) {
    try {
      // Fetch focused event ID dynamically from main server
      const statusRes = await fetch('http://localhost:3000/api/active-focus').catch(() => null);
      if (statusRes && statusRes.ok) {
        const focusData = await statusRes.json();
        if (focusData.eventId) {
          currentFocusEventId = focusData.eventId;
          currentEventType = String(focusData.eventType || '4');
        }
      }

      if (currentFocusEventId) {
        await fetchMatchOddsWorker(currentFocusEventId, currentEventType);
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 80));
  }
}

console.log('⚡ WORKER 1: Match Odds Independent Micro-Scraper Active!');
runMatchOddsWorkerLoop();
