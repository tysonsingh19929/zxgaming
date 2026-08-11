const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const capturedEventCalls = [];

async function main() {
  console.log('🚀 Deep inspecting SkyExchange Event Page Market Calls...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // Intercept all requests and responses
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/playerService/')) {
      try {
        const text = await res.text();
        const postData = res.request().postData();
        console.log(`\n<<< [API RESP] ${res.request().method()} ${url}`);
        console.log(`    Post Data: ${postData}`);
        console.log(`    Resp Snippet: ${text.substring(0, 300)}`);

        capturedEventCalls.push({
          url,
          method: res.request().method(),
          postData,
          status: res.status(),
          body: text.substring(0, 1000)
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
    const userInput = await page.$('input[placeholder*="User"], input[name*="user"], input[type="text"]');
    const passInput = await page.$('input[type="password"]');
    if (userInput && passInput) {
      await userInput.fill(USERNAME);
      await passInput.fill(PASSWORD);
      await page.waitForTimeout(500);
      const submitBtn = await page.$('button[type="submit"], button:has-text("Login")');
      if (submitBtn) await submitBtn.click();
      else await passInput.press('Enter');
      await page.waitForTimeout(4000);
    }
  } catch (e) {}

  // Navigate through Cricket, Soccer, and Tennis and click on 3 matches each
  const sports = ['Cricket', 'Soccer', 'Tennis'];

  for (const sport of sports) {
    console.log(`\n🎯 Selecting ${sport} tab in SkyExchange UI...`);
    try {
      const tab = page.locator(`text="${sport}"`).first();
      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(3000);
      }

      // Click the first 3 match links in this sport
      const matchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
      console.log(`Found ${matchLinks.length} match links for ${sport}`);

      for (let i = 0; i < Math.min(matchLinks.length, 3); i++) {
        console.log(` 🔗 Opening match #${i+1} for ${sport}...`);
        await matchLinks[i].click();
        await page.waitForTimeout(5000);
      }
    } catch (err) {
      console.log(`Error in ${sport}:`, err.message);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'all_event_markets_captured.json'),
    JSON.stringify(capturedEventCalls, null, 2)
  );

  await browser.close();
  console.log('🏁 Deep market inspection completed.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
