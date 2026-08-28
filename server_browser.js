const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { MANUAL_LOGIN_URL } = require('./config');

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

let activeTab = null;
let browserInstance = null;
let isUserLoggedIn = false;

async function startSingleTabSharedEngine() {
  console.log("==========================================================================");
  console.log("⚡ ZXGAMING SINGLE-TAB SHARED CHROME SCRAPER ENGINE");
  console.log(`Target Domain: ${MANUAL_LOGIN_URL}`);
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
  activeTab = pages[0] || await browserInstance.newPage();

  console.log(`1. Navigating Chrome tab to ${MANUAL_LOGIN_URL}...`);
  await activeTab.goto(MANUAL_LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

  console.log("\n==========================================================================");
  console.log("👉 REAL CHROME TAB IS NOW OPEN!");
  console.log("   1. Please complete manual login (Username, Password, Captcha) in Chrome.");
  console.log("   2. The scraper will automatically extract all live data from THIS EXACT TAB!");
  console.log("==========================================================================\n");

  activeTab.on('response', async (response) => {
    const url = response.url();

    if (url.includes('queryEventsWithMarket') || url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets') || url.includes('querySportsBookEvent')) {
      try {
        const text = await response.text();
        if (!text || text.includes('<!DOCTYPE')) return;
        const json = JSON.parse(text);
        
        isUserLoggedIn = true;
        processInterceptedData(url, json);
      } catch (e) {}
    }
  });

  setInterval(async () => {
    if (!activeTab || activeTab.isClosed()) return;

    try {
      const tabData = await activeTab.evaluate(async () => {
        try {
          if (window.jQuery && window.jQuery.ajax) {
          }
        } catch (e) {}
        return null;
      });
    } catch (e) {}
  }, 3000);
}

function processInterceptedData(url, json) {
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

  if (url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets')) {
    const markets = json.markets || [];
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
    loggedIn: isUserLoggedIn,
    sourceTabUrl: activeTab ? activeTab.url() : null,
    lastUpdated: liveStateCache.lastUpdated,
    total: eventsArr.length,
    events: eventsArr
  });
});

app.get('/api/event/:eventId', (req, res) => {
  const eventId = String(req.params.eventId);
  const event = liveStateCache.eventsMap.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found in live tab state' });
  }
  res.json({ status: 'OK', event });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server active at http://localhost:${PORT}`);
  startSingleTabSharedEngine().catch(console.error);
});
