const https = require('https');

const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';
const MAIN_SERVER_INGEST = 'http://localhost:3000/api/ingest/sportsbook';

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

async function fetchSportsbookWorker(eventId) {
  try {
    const formSb1 = new URLSearchParams({ eventId: String(eventId), apiSiteType: '2', version: '0', marketIds: ',', selectionTsList: ',', isDynamicUpdate: '0' });
    const sbData1 = await safeFetchJson('querySportsBookEvent', formSb1);

    const markets = [];

    if (sbData1 && sbData1.sportsBookMarket && sbData1.sportsBookMarket.length > 0) {
      const activeMarkets = sbData1.sportsBookMarket.filter(m => m.marketStatus === 1 || m.marketStatus === 2).slice(0, 50);
      if (activeMarkets.length > 0) {
        const activeIds = activeMarkets.map(m => m.id);
        const sbForm2 = new URLSearchParams({
          eventId: String(eventId), apiSiteType: '2', version: sbData1.eventUpdateDate || '0',
          marketIds: activeIds.join(',') + ',', selectionTsList: activeIds.map(() => '-1').join(',') + ',', isDynamicUpdate: '0'
        });
        const sbData2 = await safeFetchJson('querySportsBookEvent', sbForm2);
        if (sbData2 && sbData2.sportsBookMarket) {
          for (const sm of sbData2.sportsBookMarket) {
            if (sm.marketStatus === 3 || sm.marketStatus === 9) continue;
            if (!sm.sportsBookSelection || sm.sportsBookSelection.length === 0) continue;

            const selections = (sm.sportsBookSelection || []).map(sel => ({
              selectionId: String(sel.id),
              runnerName: sel.selectionName,
              odds: sel.odds,
              isActive: (sm.marketStatus === 1 && sel.isActive === 1 && sel.odds > 0),
              isBallRunning: (sm.marketStatus === 2 || sel.odds === 0 || sel.isActive === 0)
            }));

            markets.push({
              marketId: String(sm.id),
              marketName: sm.marketName,
              category: 'PREMIUM_SPORTSBOOK',
              status: sm.marketStatus,
              selections
            });
          }
        }
      }
    }

    // Send payload to central API server
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

// Continuous loop (~250ms)
let currentFocusEventId = '35913231';

async function runSportsbookWorkerLoop() {
  while (true) {
    try {
      const statusRes = await fetch('http://localhost:3000/api/active-focus').catch(() => null);
      if (statusRes && statusRes.ok) {
        const focusData = await statusRes.json();
        if (focusData.eventId) currentFocusEventId = focusData.eventId;
      }

      if (currentFocusEventId) {
        await fetchSportsbookWorker(currentFocusEventId);
      }
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

console.log('⚡ WORKER 3: Premium Sportsbook Independent Micro-Scraper Active!');
runSportsbookWorkerLoop();
