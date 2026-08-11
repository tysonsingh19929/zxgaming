const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const capturedCalls = [];

async function main() {
  console.log('🚀 Opening Match Page and Logging exact Network Requests...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/playerService/') || url.includes('/market') || url.includes('/event')) {
      console.log(`\n>>> [REQ] ${req.method()} ${url}`);
      if (req.postData()) {
        console.log(`    Post Data: ${req.postData()}`);
      }
      capturedCalls.push({
        url,
        method: req.method(),
        postData: req.postData()
      });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/playerService/')) {
      try {
        const text = await res.text();
        console.log(`<<< [RESP ${res.status()}] ${url}`);
        console.log(`    Body Snippet: ${text.substring(0, 250)}`);
      } catch (e) {}
    }
  });

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
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

  console.log('⚽ Navigating to Soccer tab...');
  const soccerTab = page.locator('text="Soccer"').first();
  if (await soccerTab.count() > 0) {
    await soccerTab.click();
    await page.waitForTimeout(3000);
  }

  console.log('🔗 Clicking on First Live Soccer Match...');
  const matchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
  if (matchLinks.length > 0) {
    await matchLinks[0].click();
    console.log('⏳ Watching match page load for 10 seconds...');
    await page.waitForTimeout(10000);
  }

  fs.writeFileSync(
    path.join(__dirname, 'opened_match_network_calls.json'),
    JSON.stringify(capturedCalls, null, 2)
  );

  await page.screenshot({ path: path.join(__dirname, 'match_page_screenshot.png') });
  console.log('📸 Screenshot saved to match_page_screenshot.png');

  await browser.close();
  console.log('🏁 Inspection finished.');
}

main().catch(console.error);
