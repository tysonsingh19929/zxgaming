const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { fork, execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

// AUTOMATICALLY FREE PORT 3000 BEFORE STARTING SERVER
function freePortOnWindows(port) {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
      const pids = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      });

      pids.forEach(pid => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`🧹 Auto-killed background process (PID ${pid}) running on port ${port}`);
        } catch (e) {}
      });
    }
  } catch (e) {}
}

freePortOnWindows(PORT);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Disable all HTTP caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 30,
  maxFreeSockets: 15,
  timeout: 5000
});

// In-Memory Cache & Micro-Service State
const cache = {
  lastUpdated: null,
  sports: [
    { id: 4, name: 'Cricket' },
    { id: 1, name: 'Soccer' },
    { id: 2, name: 'Tennis' }
  ],
  eventsMap: new Map(),
  missingScanCountMap: new Map()
};

let sseClients = [];
let activeFocusedEventId = '35920148';
let activeFocusedEventType = '4';
let hasPendingBroadcast = false;

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try { client.res.write(payload); } catch (e) {}
  });
}

// Throttle SSE broadcasts to smooth 250ms interval (Eliminates price flickering)
setInterval(() => {
  if (hasPendingBroadcast) {
    hasPendingBroadcast = false;
    broadcastSSE({
      type: 'LIVE_UPDATE',
      eventId: activeFocusedEventId,
      timestamp: cache.lastUpdated
    });
  }
}, 250);

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const HTTP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.skyexch.vip',
  'Referer': 'https://www.skyexch.vip/',
  'Connection': 'keep-alive'
};

async function safeFetchJsonNode(endpoint, bodyParams) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: HTTP_HEADERS,
      body: bodyParams.toString(),
      agent: httpsAgent
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim() === '' || text.includes('<!DOCTYPE')) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// ----------------------------------------------------
// MICRO-SERVICE INGESTION API ENDPOINTS (FROM WORKERS)
// ----------------------------------------------------

// Ingest Worker 1: Match Odds
app.post('/api/ingest/match_odds', (req, res) => {
  const { eventId, eventType, eventName, competitionName, openDateStr, isInPlay, scores, markets } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  const eventIdStr = String(eventId);
  const existing = cache.eventsMap.get(eventIdStr) || {};

  const nonMoMarkets = (existing.markets || []).filter(m => m.category !== 'MATCH_ODDS');
  const mergedMarkets = [...(markets || []), ...nonMoMarkets];

  cache.eventsMap.set(eventIdStr, {
    ...existing,
    eventId: eventIdStr,
    sportName: existing.sportName || (String(eventType) === '1' ? 'Soccer' : String(eventType) === '2' ? 'Tennis' : 'Cricket'),
    eventType: eventType || existing.eventType || 4,
    eventName: eventName || existing.eventName,
    competitionName: competitionName || existing.competitionName || 'General',
    openDateStr: openDateStr || existing.openDateStr,
    isInPlay: isInPlay !== undefined ? isInPlay : existing.isInPlay,
    scores: scores !== undefined ? scores : existing.scores,
    markets: mergedMarkets
  });
  cache.lastUpdated = new Date().toISOString();
  hasPendingBroadcast = true;

  res.json({ ok: true });
});

// Ingest Worker 2: Fancy Bet & Bookmaker
app.post('/api/ingest/fancy_bm', (req, res) => {
  const { eventId, markets } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  const eventIdStr = String(eventId);
  const existing = cache.eventsMap.get(eventIdStr) || {};

  const otherMarkets = (existing.markets || []).filter(m => m.category !== 'FANCY' && m.category !== 'BOOKMAKER');
  const mergedMarkets = [...otherMarkets, ...(markets || [])];

  cache.eventsMap.set(eventIdStr, {
    ...existing,
    markets: mergedMarkets
  });
  cache.lastUpdated = new Date().toISOString();
  hasPendingBroadcast = true;

  res.json({ ok: true });
});

// Ingest Worker 3: Premium Sportsbook
app.post('/api/ingest/sportsbook', (req, res) => {
  const { eventId, markets } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  const eventIdStr = String(eventId);
  const existing = cache.eventsMap.get(eventIdStr) || {};

  const otherMarkets = (existing.markets || []).filter(m => m.category !== 'PREMIUM_SPORTSBOOK');
  const mergedMarkets = [...otherMarkets, ...(markets || [])];

  cache.eventsMap.set(eventIdStr, {
    ...existing,
    markets: mergedMarkets
  });
  cache.lastUpdated = new Date().toISOString();
  hasPendingBroadcast = true;

  res.json({ ok: true });
});

// Active Focus Endpoint for Workers
app.get('/api/active-focus', (req, res) => {
  res.json({
    eventId: activeFocusedEventId,
    eventType: activeFocusedEventType
  });
});

// Background Discovery Loop (Captures Active Matches Across Sports)
async function pollAllEventsBackground() {
  try {
    const activeEventIds = new Set();
    let hasSuccessfulScan = false;

    for (const sport of cache.sports) {
      for (let page = 1; page <= 3; page++) {
        const form = new URLSearchParams({
          eventType: sport.id.toString(), eventTs: '-1', marketTs: '-1', selectionTs: '-1',
          viewType: 'openDateTime', competitionId: '-1', pageNumber: page.toString()
        });
        const data = await safeFetchJsonNode('queryEventsWithMarket', form);

        if (data && data.events && Array.isArray(data.events)) {
          hasSuccessfulScan = true;
          for (const ev of data.events) {
            const eventIdStr = String(ev.id);
            activeEventIds.add(eventIdStr);

            const existing = cache.eventsMap.get(eventIdStr) || {};

            cache.eventsMap.set(eventIdStr, {
              eventId: eventIdStr,
              sportName: sport.name,
              eventType: sport.id,
              eventName: ev.name,
              competitionName: ev.competitionName || 'General',
              openDateStr: ev.openDateStr || ev.openDate,
              isInPlay: ev.isInPlay === 1,
              scores: ev.scores ? (typeof ev.scores === 'string' ? JSON.parse(ev.scores) : ev.scores) : null,
              hasBookmaker: Boolean(ev.hasBookMakerMarkets),
              hasFancy: Boolean(ev.hasFancyBetMarkets),
              hasPremiumSportsbook: true,
              markets: existing.markets || []
            });
          }
        }
      }
    }

    if (hasSuccessfulScan && activeEventIds.size > 0) {
      for (const cachedId of Array.from(cache.eventsMap.keys())) {
        if (!activeEventIds.has(cachedId)) {
          const missCount = (cache.missingScanCountMap.get(cachedId) || 0) + 1;
          if (missCount >= 3) {
            cache.eventsMap.delete(cachedId);
            cache.missingScanCountMap.delete(cachedId);
          } else {
            cache.missingScanCountMap.set(cachedId, missCount);
          }
        } else {
          cache.missingScanCountMap.delete(cachedId);
        }
      }

      if (!activeFocusedEventId || !cache.eventsMap.has(activeFocusedEventId)) {
        const remaining = Array.from(cache.eventsMap.keys());
        if (remaining.length > 0) {
          activeFocusedEventId = remaining[0];
          activeFocusedEventType = String(cache.eventsMap.get(remaining[0]).eventType || '4');
        }
      }
    }
  } catch (err) {
    console.error('Error in pollAllEventsBackground:', err.message);
  }
}

// Kickstart Background Discovery
setInterval(pollAllEventsBackground, 4000);
pollAllEventsBackground();

// REST APIs FOR FRONTEND
app.get('/api/events', (req, res) => {
  const sportFilter = req.query.sport;
  const search = (req.query.search || '').toLowerCase().trim();

  let list = Array.from(cache.eventsMap.values());

  if (sportFilter && sportFilter !== 'all') {
    list = list.filter(e => e.sportName.toLowerCase() === sportFilter.toLowerCase());
  }

  if (search) {
    list = list.filter(e => 
      e.eventId.toLowerCase().includes(search) ||
      e.eventName.toLowerCase().includes(search) ||
      e.competitionName.toLowerCase().includes(search)
    );
  }

  res.json({
    timestamp: cache.lastUpdated,
    total: list.length,
    events: list.map(e => ({
      eventId: e.eventId,
      sportName: e.sportName,
      eventType: e.eventType,
      eventName: e.eventName,
      competitionName: e.competitionName,
      openDateStr: e.openDateStr,
      isInPlay: e.isInPlay,
      hasBookmaker: e.hasBookmaker,
      hasFancy: e.hasFancy,
      hasPremiumSportsbook: e.hasPremiumSportsbook,
      scores: e.scores,
      marketCount: e.markets ? e.markets.length : 0
    }))
  });
});

app.get('/api/event/:eventId', (req, res) => {
  const eventId = String(req.params.eventId);
  const categoryFilter = req.query.category;
  
  activeFocusedEventId = eventId;
  const evInfo = cache.eventsMap.get(eventId);
  if (evInfo) {
    activeFocusedEventType = String(evInfo.eventType || '4');
  }

  const event = cache.eventsMap.get(eventId);

  if (!event) {
    return res.status(404).json({ error: `Event ID '${eventId}' not found.` });
  }

  let filteredMarkets = event.markets || [];
  if (categoryFilter && categoryFilter !== 'ALL') {
    if (categoryFilter === 'PREMIUM_SPORTSBOOK' || categoryFilter === 'PREMIUM_FANCY') {
      filteredMarkets = filteredMarkets.filter(m => m.category === 'PREMIUM_SPORTSBOOK' || m.category === 'PREMIUM_FANCY');
    } else {
      filteredMarkets = filteredMarkets.filter(m => m.category === categoryFilter);
    }
  }

  res.json({
    timestamp: cache.lastUpdated,
    event: {
      ...event,
      markets: filteredMarkets
    }
  });
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// START SERVER AND LAUNCH DECOUPLED INDEPENDENT WORKER MICRO-SERVICES
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ AllPanel777 Master Server Engine running at http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Launch Worker 1: Match Odds
  try {
    const w1 = fork(path.join(__dirname, 'workers', 'worker_match_odds.js'));
    console.log(`🚀 Spawned Worker 1 (Match Odds) - PID ${w1.pid}`);
  } catch (e) { console.error('Failed to spawn Worker 1:', e.message); }

  // Launch Worker 2: Fancy Bet & Bookmaker
  try {
    const w2 = fork(path.join(__dirname, 'workers', 'worker_fancy_bm.js'));
    console.log(`🚀 Spawned Worker 2 (Fancy Bet + Bookmaker) - PID ${w2.pid}`);
  } catch (e) { console.error('Failed to spawn Worker 2:', e.message); }

  // Launch Worker 3: Premium Sportsbook
  try {
    const w3 = fork(path.join(__dirname, 'workers', 'worker_sportsbook.js'));
    console.log(`🚀 Spawned Worker 3 (Premium Sportsbook) - PID ${w3.pid}`);
  } catch (e) { console.error('Failed to spawn Worker 3:', e.message); }
});
