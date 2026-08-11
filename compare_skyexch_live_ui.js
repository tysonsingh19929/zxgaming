const { chromium } = require('playwright');

async function compareSkyexchUi() {
  console.log('🚀 Opening skyexch.vip UI to inspect live rendered DOM tables...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', req => {
    if (req.url().includes('query')) {
      console.log('📡 Request:', req.url(), req.postData() || '');
    }
  });

  await page.goto('https://www.skyexch.vip', { waitUntil: 'networkidle' });

  // Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
    await page.fill('input[placeholder*="User"], input[name*="user"], input[type="text"]', 'tsingh99');
    await page.fill('input[type="password"]', 'Abcd1234');
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForTimeout(5000);
  } catch (e) {}

  // Click on Cricket -> Match
  console.log('Searching for match Antigua & Barbuda Falcons on page...');
  const matchLink = await page.$('text=Antigua & Barbuda Falcons');
  if (matchLink) {
    await matchLink.click();
    await page.waitForTimeout(5000);
  } else {
    await page.goto('https://www.skyexch.vip/#/fullMarket/4/35916421');
    await page.waitForTimeout(6000);
  }

  // Extract all text content from market containers
  const domMarkets = await page.evaluate(() => {
    const results = [];
    const tables = document.querySelectorAll('table, .market-container, .fancy-bet-container');
    tables.forEach(t => {
      results.push(t.innerText);
    });
    return results;
  });

  console.log('\n--- RENDERED UI TABLES ON SKYEXCHANGE ---');
  domMarkets.forEach((mText, i) => {
    console.log(`\n--- TABLE ${i + 1} ---`);
    console.log(mText.slice(0, 500));
  });

  await browser.close();
}

compareSkyexchUi().catch(console.error);
