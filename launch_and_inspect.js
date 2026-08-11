const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const capturedData = {
  requests: [],
  apiResponses: [],
};

async function main() {
  console.log('🚀 Launching Playwright Chromium...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // Intercept all network requests and log post data & responses
  page.on('request', (req) => {
    if (req.url().includes('/playerService/')) {
      console.log(`\n>>> [API REQ] ${req.method()} ${req.url()}`);
      if (req.postData()) {
        console.log(`    [POST DATA] ${req.postData()}`);
      }
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/playerService/')) {
      try {
        const text = await response.text();
        let body;
        try { body = JSON.parse(text); } catch { body = text; }

        console.log(`<<< [API RESP] [${response.status()}] ${url}`);
        capturedData.apiResponses.push({
          url,
          status: response.status(),
          method: response.request().method(),
          postData: response.request().postData(),
          body
        });

        fs.writeFileSync(
          path.join(__dirname, 'captured_network.json'),
          JSON.stringify(capturedData, null, 2)
        );
      } catch (e) {}
    }
  });

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Perform Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) {
      console.log('🔑 Clicking Login...');
      await loginBtn.click();
      await page.waitForTimeout(1000);
    }

    const userInput = await page.$('input[placeholder*="User"], input[placeholder*="ID"], input[name*="user"], #userId, input[type="text"]');
    const passInput = await page.$('input[type="password"]');

    if (userInput && passInput) {
      console.log('✍️ Filling credentials...');
      await userInput.fill(USERNAME);
      await passInput.fill(PASSWORD);
      await page.waitForTimeout(500);

      const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), .submit-btn, #loginBtn');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passInput.press('Enter');
      }
      console.log('⏳ Waiting for login response...');
      await page.waitForTimeout(5000);
    }
  } catch (err) {
    console.log('⚠️ Login attempt error:', err.message);
  }

  // Sports to click: Cricket (eventType: 4), Soccer (eventType: 1), Tennis (eventType: 2)
  const sports = [
    { name: 'Cricket', eventType: 4 },
    { name: 'Soccer', eventType: 1 },
    { name: 'Tennis', eventType: 2 }
  ];

  for (const sport of sports) {
    console.log(`\n🎯 Navigating to ${sport.name} tab...`);
    try {
      // Find element containing exact text
      const tab = page.locator(`text="${sport.name}"`).first();
      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(4000);
      } else {
        console.log(`Could not find locator text="${sport.name}" directly`);
      }

      // Find match links on the page and click the first 2
      const matchLinks = await page.$$('a[href*="event"], a[href*="market"], .game-list a, tr.event-row, div.match-name, .game-name');
      console.log(`Found ${matchLinks.length} match elements for ${sport.name}`);
      for (let i = 0; i < Math.min(matchLinks.length, 3); i++) {
        try {
          console.log(`  🔗 Clicking match #${i+1} for ${sport.name}...`);
          await matchLinks[i].click();
          await page.waitForTimeout(3000);
        } catch (e) {}
      }
    } catch (e) {
      console.log(`Error navigating ${sport.name}:`, e.message);
    }
  }

  console.log('\n⏳ Waiting 10s for final market endpoints to trigger...');
  await page.waitForTimeout(10000);

  await browser.close();
  console.log('🏁 Inspection script finished successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
