const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const liveDataCaptured = {
  wsFrames: [],
  pollingResponses: []
};

async function main() {
  console.log('🚀 Inspecting Live Match Odds Stream & WebSockets...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // Listen to WebSockets
  page.on('websocket', ws => {
    console.log(`📡 WebSocket connected: ${ws.url()}`);
    ws.on('framereceived', frame => {
      console.log(`📥 [WS RECV] ${frame.payload.toString().substring(0, 200)}`);
      liveDataCaptured.wsFrames.push({
        dir: 'RECV',
        url: ws.url(),
        data: frame.payload.toString()
      });
    });
    ws.on('framesent', frame => {
      console.log(`📤 [WS SENT] ${frame.payload.toString().substring(0, 200)}`);
      liveDataCaptured.wsFrames.push({
        dir: 'SENT',
        url: ws.url(),
        data: frame.payload.toString()
      });
    });
  });

  // Listen to live polling HTTP responses
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/playerService/') || url.includes('/odds') || url.includes('/market') || url.includes('/fancy')) {
      try {
        const text = await res.text();
        console.log(`\n<<< [LIVE RESP] [${res.status()}] ${url}`);
        console.log(`    Data snippet: ${text.substring(0, 300)}`);
        liveDataCaptured.pollingResponses.push({
          url,
          status: res.status(),
          data: text
        });
      } catch (e) {}
    }
  });

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(1000);
    }

    const userInput = await page.$('input[placeholder*="User"], input[placeholder*="ID"], input[name*="user"], #userId, input[type="text"]');
    const passInput = await page.$('input[type="password"]');

    if (userInput && passInput) {
      console.log('🔑 Logging in...');
      await userInput.fill(USERNAME);
      await passInput.fill(PASSWORD);
      await page.waitForTimeout(500);

      const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), .submit-btn');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passInput.press('Enter');
      }
      await page.waitForTimeout(4000);
    }
  } catch (e) {}

  // Go to In-Play tab
  console.log('🎯 Navigating to In-Play tab...');
  try {
    const inPlayTab = page.locator('text="In-Play"').first();
    if (await inPlayTab.count() > 0) {
      await inPlayTab.click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  // Find live matches and click the first live match
  console.log('🔍 Locating live event links...');
  const matchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
  console.log(`Found ${matchLinks.length} match link elements`);

  if (matchLinks.length > 0) {
    console.log('🔗 Opening First Live Event Page...');
    await matchLinks[0].click();
    console.log('⏳ Watching live market odds stream for 25 seconds...');
    await page.waitForTimeout(25000);
  } else {
    console.log('⚠️ Could not find direct match link, waiting 20s on page...');
    await page.waitForTimeout(20000);
  }

  fs.writeFileSync(
    path.join(__dirname, 'live_stream_capture.json'),
    JSON.stringify(liveDataCaptured, null, 2)
  );

  console.log('📸 Saving live session screenshot...');
  await page.screenshot({ path: path.join(__dirname, 'live_match_view.png') });

  await browser.close();
  console.log('🏁 Live inspection completed.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
