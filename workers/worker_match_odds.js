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

async function fetchMatchOddsWorker(eventId, eventType = '4') {
  try {
    const form = new URLSearchParams({
      eventType: String(eventType),
      eventTs: '0',
      marketTs: '0',
      selectionTs: '0',
      isDynamicUpdate: '1',
      viewType: 'openDateTime',
      competitionId: '-1',
      collectEventIds: String(eventId)
    });

    const data = await safeFetchJson('queryEventsWithMarket', form);
    if (!data || !data.events || data.events.length === 0) return;

    const targetEv = data.events.find(e => String(e.id) === String(eventId)) || data.events[0];
    if (!targetEv) return;

    const markets = [];
    const m = targetEv.market || (targetEv.markets ? targetEv.markets[0] : null);

    if (m) {
      const selections = (m.selections || m.runners || []).map(s => {
        let backList = s.availableToBack || [];
        let layList = s.availableToLay || [];

        // Clean & sort backList (highest price first)
        backList = backList.filter(b => b.price !== '' && b.price !== null && !isNaN(b.price));
        // Clean & sort layList (lowest price first)
        layList = layList.filter(l => l.price !== '' && l.price !== null && !isNaN(l.price));

        return {
          selectionId: String(s.selectionId || s.id),
          runnerName: s.runnerName || s.name,
          sortPriority: s.sortPriority || s.sortOrder || 0,
          status: s.status || m.status,
          availableToBack: backList,
          availableToLay: layList
        };
      });

      markets.push({
        marketId: String(m.marketId || m.id),
        marketName: m.marketName || m.name || 'Match Odds',
        category: 'MATCH_ODDS',
        status: m.status,
        selections
      });
    }

    await fetch(MAIN_SERVER_INGEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: String(eventId),
        eventType: targetEv.eventType || eventType,
        eventName: targetEv.name,
        competitionName: targetEv.competitionName || 'General',
        openDateStr: targetEv.openDateStr || targetEv.openDate,
        isInPlay: targetEv.isInPlay === 1,
        scores: targetEv.scores ? (typeof targetEv.scores === 'string' ? JSON.parse(targetEv.scores) : targetEv.scores) : null,
        markets
      })
    });
  } catch (e) {}
}

let currentFocusEventId = '35924127';
let currentFocusEventType = '4';

async function runMatchOddsWorkerLoop() {
  while (true) {
    try {
      const statusRes = await fetch('http://localhost:3000/api/active-focus').catch(() => null);
      if (statusRes && statusRes.ok) {
        const focusData = await statusRes.json();
        if (focusData.eventId) {
          currentFocusEventId = focusData.eventId;
          currentFocusEventType = focusData.eventType || '4';
        }
      }

      if (currentFocusEventId) {
        await fetchMatchOddsWorker(currentFocusEventId, currentFocusEventType);
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 60));
  }
}

console.log('⚡ WORKER 1: Match Odds 50ms Priority Scraper Active!');
runMatchOddsWorkerLoop();
