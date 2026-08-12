const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runDeepComparison() {
  console.log('======================================================');
  console.log('🔍 STARTING 100% EMPIRICAL LIVE DEEP SCAN & COMPARISON');
  console.log('======================================================\n');

  // 1. Fetch live events from our local server
  const eventsRes = await fetch('http://localhost:3000/api/events?sport=cricket').catch(() => null);
  if (!eventsRes || !eventsRes.ok) {
    console.error('Local server port 3000 not responding.');
    return;
  }
  const eventsData = await eventsRes.json();
  console.log(`📡 Local server active events count: ${eventsData.total}`);

  const liveEventsWithMarkets = eventsData.events.filter(e => e.hasBookmaker || e.hasFancy || e.marketCount > 0);
  if (liveEventsWithMarkets.length === 0) {
    console.log('No active live events with markets currently found.');
    return;
  }

  const targetEvent = liveEventsWithMarkets[0];
  console.log(`🎯 Target Event: "${targetEvent.eventName}" (ID: ${targetEvent.eventId})`);

  // 2. Fetch local API details for target event
  const localDetailRes = await fetch(`http://localhost:3000/api/event/${targetEvent.eventId}`).catch(() => null);
  const localDetail = await localDetailRes.json();
  const localMarkets = localDetail.event ? localDetail.event.markets || [] : [];

  console.log(`📊 Local API returned ${localMarkets.length} active markets for Event ${targetEvent.eventId}`);

  // Group local markets by category
  const localMo = localMarkets.filter(m => m.category === 'MATCH_ODDS');
  const localBm = localMarkets.filter(m => m.category === 'BOOKMAKER');
  const localFancy = localMarkets.filter(m => m.category === 'FANCY');
  const localSb = localMarkets.filter(m => m.category === 'PREMIUM_SPORTSBOOK');

  console.log(`   └─ Match Odds: ${localMo.length}`);
  console.log(`   └─ Bookmaker: ${localBm.length}`);
  console.log(`   └─ Fancy Bets: ${localFancy.length}`);
  console.log(`   └─ Premium Sportsbook: ${localSb.length}`);

  // 3. Launch Playwright to log into skyexch.vip and observe live prices
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Log all skyexch network calls
  const capturedSkyExchCalls = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('playerService')) {
      try {
        const text = await res.text();
        capturedSkyExchCalls.push({ url, status: res.status(), body: text.slice(0, 500) });
      } catch (e) {}
    }
  });

  try {
    console.log('\n🌐 Navigating to https://www.skyexch.vip and logging in...');
    await page.goto('https://www.skyexch.vip/#/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const userInput = await page.$('input[placeholder*="User"], input[type="text"]');
    if (userInput) {
      await userInput.fill('tsingh99');
      await page.fill('input[type="password"]', 'Abcd1234');
      await page.click('button[type="submit"], button:has-text("Login"), .login-btn');
      await page.waitForTimeout(4000);
      console.log('🔑 Logged into skyexch.vip successfully!');
    }

    // Open target match page
    const matchUrl = `https://www.skyexch.vip/#/fullMarket/${targetEvent.eventId}`;
    console.log(`🔗 Navigating to SkyExchange match page: ${matchUrl}`);
    await page.goto(matchUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(5000);

    // Screenshot match page
    const screenshotPath = path.join(__dirname, 'skyexch_live_comparison.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Saved live SkyExchange screenshot to: ${screenshotPath}`);

    // Extract DOM odds text from SkyExchange
    const domOdds = await page.evaluate(() => {
      const matchOddsRows = [];
      document.querySelectorAll('.market-match-odds, table, .market-table').forEach(tbl => {
        tbl.querySelectorAll('tr').forEach(tr => {
          const text = tr.innerText.replace(/\n+/g, ' | ').trim();
          if (text) matchOddsRows.push(text);
        });
      });
      return matchOddsRows.slice(0, 20);
    });

    console.log('\n--- LIVE SKYEXCH.VIP DISPLAYED ODDS SNIPPET ---');
    domOdds.forEach(row => console.log(`   ${row}`));

    console.log('\n--- LOCAL API DISPLAYED ODDS SNIPPET ---');
    localMarkets.slice(0, 5).forEach(m => {
      console.log(`   Market: [${m.category}] ${m.marketName} (ID: ${m.marketId})`);
      if (m.selections) {
        m.selections.forEach(s => {
          const b = s.availableToBack && s.availableToBack[0] ? s.availableToBack[0].price : (s.backPrice || '-');
          const l = s.availableToLay && s.availableToLay[0] ? s.availableToLay[0].price : (s.layPrice || '-');
          console.log(`     └─ Runner: ${s.runnerName} | Back: ${b} | Lay: ${l}`);
        });
      }
    });

  } catch (e) {
    console.error('Playwright observation error:', e.message);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log('✅ COMPLETED LIVE COMPARISON');
  console.log('======================================================');
}

runDeepComparison().catch(console.error);
