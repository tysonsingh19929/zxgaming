const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip/#/fullMarket/4-35916421?marketId=1.260884775';

const capturedCalls = [];

async function main() {
  console.log('🚀 Inspecting Premium Cricket / Sportsbook API Endpoint...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    console.log(`\n>>> [REQ] ${req.method()} ${url}`);
    if (req.postData()) {
      console.log(`    Post Data: ${req.postData()}`);
    }
    capturedCalls.push({
      url,
      method: req.method(),
      postData: req.postData()
    });
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/playerService/') || url.includes('premium') || url.includes('sportsbook') || url.includes('vendor') || url.includes('market') || url.includes('bxawscf')) {
      try {
        const text = await res.text();
        console.log(`<<< [RESP ${res.status()}] ${url}`);
        console.log(`    Body Snippet: ${text.substring(0, 400)}`);
      } catch (e) {}
    }
  });

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto('https://www.skyexch.vip', { waitUntil: 'domcontentloaded' });
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

  console.log(`🔗 Navigating directly to match URL: ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Find and Click the "Premium Cricket" or "Premium" Tab
  console.log('🔍 Locating "Premium Cricket" tab on page...');
  const premiumTab = page.locator('text="Premium Cricket"').first();
  if (await premiumTab.count() > 0) {
    console.log('🎯 Found "Premium Cricket" tab! Clicking now...');
    await premiumTab.click();
    await page.waitForTimeout(6000);
  } else {
    console.log('Looking for tab by text substring...');
    const tabs = await page.$$('div, button, li, a, span');
    for (const t of tabs) {
      try {
        const text = (await t.innerText()).trim();
        if (text.includes('Premium')) {
          console.log(`Found tab: "${text}"! Clicking...`);
          await t.click();
          await page.waitForTimeout(6000);
          break;
        }
      } catch (e) {}
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'premium_cricket_captured_calls.json'),
    JSON.stringify(capturedCalls, null, 2)
  );

  await page.screenshot({ path: path.join(__dirname, 'premium_cricket_screenshot.png') });
  console.log('📸 Screenshot saved to premium_cricket_screenshot.png');

  await browser.close();
  console.log('🏁 Inspection finished.');
}

main().catch(console.error);
