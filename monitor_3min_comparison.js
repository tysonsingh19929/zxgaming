const { chromium } = require('playwright');
const fs = require('fs');

async function monitor3MinComparison() {
  console.log('🚀 Launching Playwright browser to log in and observe skyexch.vip vs localhost:3000 for 3 minutes...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const skyexchTicks = [];

  // Capture real network API responses from skyexch.vip frontend
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('queryEventsWithMarket') || url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        const endpoint = url.split('/').pop();
        skyexchTicks.push({
          time: new Date().toISOString(),
          endpoint,
          data: json
        });
        console.log(`[SkyExch API ${new Date().toLocaleTimeString()}] ${endpoint} updated!`);
      } catch (e) {}
    }
  });

  console.log('Logging in to skyexch.vip...');
  await page.goto('https://www.skyexch.vip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
    await page.fill('input[placeholder*="User"], input[name*="user"], input[type="text"]', 'tsingh99');
    await page.fill('input[type="password"]', 'Abcd1234');
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForTimeout(4000);
  } catch (e) {}

  console.log('Navigating to live match #/fullMarket/4/35916421...');
  await page.goto('https://www.skyexch.vip/#/fullMarket/4/35916421');
  await page.waitForTimeout(5000);

  console.log('⏱️ Monitoring live odds ticks side-by-side for 60 seconds...');

  const comparisonLog = [];
  const startTime = Date.now();
  const durationMs = 60 * 1000; // 60 seconds deep observation

  while (Date.now() - startTime < durationMs) {
    const nowStr = new Date().toLocaleTimeString();

    // 1. Fetch current localhost:3000 state
    let localData = null;
    try {
      const res = await fetch(`http://localhost:3000/api/event/35916421?t=${Date.now()}`);
      localData = await res.json();
    } catch (e) {}

    // Extract Match Odds and Bookmaker from local
    const localMo = localData && localData.event && localData.event.markets ? localData.event.markets.find(m => m.category === 'MATCH_ODDS') : null;
    const localBm = localData && localData.event && localData.event.markets ? localData.event.markets.find(m => m.category === 'BOOKMAKER') : null;

    const localMoSel1 = localMo && localMo.selections ? localMo.selections[0] : null;
    const localBmSel1 = localBm && localBm.selections ? localBm.selections.find(s => s.backPrice) : null;

    // Extract rendered UI text from skyexch.vip page
    const skyUiText = await page.evaluate(() => {
      const elMo = document.querySelector('.market-container, table');
      return elMo ? elMo.innerText.replace(/\s+/g, ' ').slice(0, 300) : 'N/A';
    });

    const entry = {
      time: nowStr,
      localMatchOddsRunner: localMoSel1 ? localMoSel1.runnerName : 'N/A',
      localMatchOddsBack: localMoSel1 ? localMoSel1.backPrice : 'N/A',
      localMatchOddsLay: localMoSel1 ? localMoSel1.layPrice : 'N/A',
      localBmRunner: localBmSel1 ? localBmSel1.runnerName : 'N/A',
      localBmBack: localBmSel1 ? localBmSel1.backPrice : 'N/A',
      localBmLay: localBmSel1 ? localBmSel1.layPrice : 'N/A',
      skyUiSnippet: skyUiText
    };

    comparisonLog.push(entry);
    console.log(`[${nowStr}] Local MO: ${entry.localMatchOddsRunner} Back ${entry.localMatchOddsBack} / Lay ${entry.localMatchOddsLay} | Local BM: ${entry.localBmRunner} ${entry.localBmBack}/${entry.localBmLay}`);

    await page.waitForTimeout(3000);
  }

  console.log('\n--- 3-MINUTE OBSERVATION COMPLETE ---');
  console.log(`SkyExch API Ticks captured: ${skyexchTicks.length}`);
  fs.writeFileSync('skyexch_ticks.json', JSON.stringify(skyexchTicks, null, 2));
  fs.writeFileSync('comparison_log.json', JSON.stringify(comparisonLog, null, 2));

  await browser.close();
}

monitor3MinComparison().catch(console.error);
