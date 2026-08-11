const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const capturedSportsbookEndpoints = [];

async function main() {
  console.log('🚀 Inspecting Sportsbook & Premium Fancy Market Endpoints...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/playerService/') || url.includes('sportsbook') || url.includes('premium') || url.includes('fancy')) {
      console.log(`\n>>> [REQ] ${req.method()} ${url}`);
      if (req.postData()) {
        console.log(`    Post Data: ${req.postData()}`);
      }
      capturedSportsbookEndpoints.push({
        url,
        method: req.method(),
        postData: req.postData()
      });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/playerService/') || url.includes('sportsbook') || url.includes('premium')) {
      try {
        const text = await res.text();
        console.log(`<<< [RESP ${res.status()}] ${url}`);
        console.log(`    Body Snippet: ${text.substring(0, 300)}`);
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

  console.log('🏏 Selecting Cricket tab...');
  const cricketTab = page.locator('text="Cricket"').first();
  if (await cricketTab.count() > 0) {
    await cricketTab.click();
    await page.waitForTimeout(3000);
  }

  console.log('🔗 Clicking on Antigua & Barbuda Falcons or First Match...');
  const matchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
  if (matchLinks.length > 0) {
    await matchLinks[0].click();
    await page.waitForTimeout(4000);

    // Look for Sportsbook or Premium Fancy or Sports Book tab on the match page
    console.log('🔍 Looking for Sportsbook / Premium Fancy tabs inside match view...');
    const tabs = await page.$$('div, button, li, a, span');
    for (const t of tabs) {
      try {
        const text = (await t.innerText()).trim();
        if (text === 'Sportsbook' || text === 'Premium Fancy' || text === 'Sports Book' || text.includes('Sportsbook')) {
          console.log(`Found tab: "${text}"! Clicking...`);
          await t.click();
          await page.waitForTimeout(4000);
          break;
        }
      } catch (e) {}
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'sportsbook_premium_fancy_calls.json'),
    JSON.stringify(capturedSportsbookEndpoints, null, 2)
  );

  await page.screenshot({ path: path.join(__dirname, 'sportsbook_tab_screenshot.png') });
  console.log('📸 Saved sportsbook_tab_screenshot.png');

  await browser.close();
  console.log('🏁 Inspection finished.');
}

main().catch(console.error);
