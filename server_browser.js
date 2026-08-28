const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { MANUAL_LOGIN_URL, API_BASE } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const liveStateCache = {
  lastUpdated: new Date().toISOString(),
  eventsMap: new Map(),
  sports: [
    { id: 4, name: 'Cricket' },
    { id: 1, name: 'Soccer' },
    { id: 2, name: 'Tennis' }
  ]
};

let tabFancyBm = null;
let tabSportsbook = null;
let browserInstance = null;

let isFancyLoggedIn = false;
let isSportsbookLoggedIn = false;

async function startDualTabAutoEngine() {
  console.log("==========================================================================");
  console.log("⚡ ZXGAMING DUAL-TAB AUTO-SCRAPER ENGINE");
  console.log(`Tab 1 (Fancy & Bookmaker Domain): ${MANUAL_LOGIN_URL}`);
  console.log(`Tab 2 (Sportsbook Domain): ${MANUAL_LOGIN_URL}`);
  console.log("==========================================================================\n");

  browserInstance = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--no-sandbox',
      '--remote-debugging-port=9222'
    ]
  });

  const pages = await browserInstance.pages();
  tabFancyBm = pages[0] || await browserInstance.newPage();
  tabSportsbook = await browserInstance.newPage();

  console.log("1. Opening Tab 1 for Fancy Bet & Bookmaker...");
  await tabFancyBm.goto(MANUAL_LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

  console.log("2. Opening Tab 2 for Premium Sportsbook...");
  await tabSportsbook.goto(MANUAL_LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

  await tabFancyBm.bringToFront();

  console.log("\n==========================================================================");
  console.log("👉 DUAL CHROME TABS ARE NOW OPEN!");
  console.log("   1. Please complete manual login (with Captcha) on Tab 1 and Tab 2.");
  console.log("   2. You DO NOT need to click into matches! The tabs will automatically");
  console.log("      scrape ALL active match markets in the background!");
  console.log("==========================================================================\n");

  setupTabInterceptors(tabFancyBm, 'TAB_FANCY_BM');
  setupTabInterceptors(tabSportsbook, 'TAB_SPORTSBOOK');

  startBackgroundAutoFetchLoop();
}

function setupTabInterceptors(tab, tabLabel) {
  tab.on('response', async (response) => {
    const url = response.url();
    if (url.includes('queryEventsWithMarket') || url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets') || url.includes('querySportsBookEvent')) {
      try {
        const text = await response.text();
        if (!text || text.includes('<!DOCTYPE')) return;
        const json = JSON.parse(text);

        if (tabLabel === 'TAB_FANCY_BM') isFancyLoggedIn = true;
        if (tabLabel === 'TAB_SPORTSBOOK') isSportsbookLoggedIn = true;

        processDataIntoCache(url, json);
      } catch (e) {}
    }
  });
}

function startBackgroundAutoFetchLoop() {
  setInterval(async () => {
    if (!tabFancyBm || tabFancyBm.isClosed()) return;

    try {
      const eventsRes = await tabFancyBm.evaluate(async (apiBase) => {
        try {
          const body = new URLSearchParams({
            eventType: '4',
            eventTs: '-1',
            marketTs: '-1',
            selectionTs: '-1',
            viewType: 'openDateTime',
            competitionId: '-1',
            pageNumber: '1'
          });
          const res = await fetch(apiBase + 'queryEventsWithMarket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: body.toString()
          });
          return await res.json();
        } catch (e) {
          return null;
        }
      }, API_BASE);

      if (eventsRes && eventsRes.events) {
        eventsRes.events.forEach(e => {
          const eventIdStr = String(e.id);
          if (!liveStateCache.eventsMap.has(eventIdStr)) {
            liveStateCache.eventsMap.set(eventIdStr, {
              eventId: eventIdStr,
              eventName: e.name,
              sport: 'Cricket',
              markets: [],
              results: [],
              updatedAt: new Date().toISOString()
            });
          }
        });
        liveStateCache.lastUpdated = new Date().toISOString();

        const activeEvents = Array.from(liveStateCache.eventsMap.keys()).slice(0, 10);
        for (const eventIdStr of activeEvents) {
          tabFancyBm.evaluate(async (apiBase, evtId) => {
            try {
              const body = new URLSearchParams({ eventId: evtId, eventType: '4' });
              fetch(apiBase + 'queryBookMakerMarkets', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() });
              fetch(apiBase + 'queryFancyBetMarkets', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() });
            } catch (e) {}
          }, API_BASE, eventIdStr).catch(() => {});
        }

        if (tabSportsbook && !tabSportsbook.isClosed()) {
          for (const eventIdStr of activeEvents) {
            tabSportsbook.evaluate(async (apiBase, evtId) => {
              try {
                const body = new URLSearchParams({ eventId: evtId, eventType: '4' });
                fetch(apiBase + 'querySportsBookEvent', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() });
              } catch (e) {}
            }, API_BASE, eventIdStr).catch(() => {});
          }
        }
      }

    } catch (e) {}
  }, 4000);
}

function processDataIntoCache(url, json) {
  if (url.includes('queryEventsWithMarket')) {
    const events = json.events || json.data || [];
    events.forEach(e => {
      const eventIdStr = String(e.id);
      let existing = liveStateCache.eventsMap.get(eventIdStr);
      if (!existing) {
        existing = {
          eventId: eventIdStr,
          eventName: e.name || e.eventName,
          sport: 'Cricket',
          markets: [],
          results: [],
          updatedAt: new Date().toISOString()
        };
      }
      liveStateCache.eventsMap.set(eventIdStr, existing);
    });
    liveStateCache.lastUpdated = new Date().toISOString();
  }

  if (url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets') || url.includes('querySportsBookEvent')) {
    const markets = json.markets || json.data || [];
    markets.forEach(m => {
      const eventIdStr = String(m.eventId || m.id);
      let existing = liveStateCache.eventsMap.get(eventIdStr);
      if (existing) {
        const mIdStr = String(m.id);
        const existingMIndex = existing.markets.findIndex(x => String(x.id) === mIdStr);
        if (existingMIndex >= 0) {
          existing.markets[existingMIndex] = m;
        } else {
          existing.markets.push(m);
        }
        existing.updatedAt = new Date().toISOString();
      }
    });
  }
}

app.get('/api/events', (req, res) => {
  const eventsArr = Array.from(liveStateCache.eventsMap.values()).map(e => ({
    eventId: e.eventId,
    eventName: e.eventName,
    sport: e.sport,
    marketCount: e.markets.length,
    updatedAt: e.updatedAt
  }));

  res.json({
    status: 'OK',
    tabsStatus: {
      tab1FancyBmLoggedIn: isFancyLoggedIn,
      tab2SportsbookLoggedIn: isSportsbookLoggedIn
    },
    lastUpdated: liveStateCache.lastUpdated,
    total: eventsArr.length,
    events: eventsArr
  });
});

app.get('/api/event/:eventId', (req, res) => {
  const eventId = String(req.params.eventId);
  const event = liveStateCache.eventsMap.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found in live cache' });
  }
  res.json({ status: 'OK', event });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server active at http://localhost:${PORT}`);
  startDualTabAutoEngine().catch(console.error);
});
