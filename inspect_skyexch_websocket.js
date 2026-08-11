const { chromium } = require('playwright');

async function inspectSkyexchNetwork() {
  console.log('🚀 Inspecting skyexch.vip network traffic...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLog = [];

  page.on('request', req => {
    if (req.url().includes('exchange') || req.url().includes('ws') || req.url().includes('socket') || req.url().includes('playerService')) {
      networkLog.push({ type: 'REQ', method: req.method(), url: req.url(), postData: req.postData() });
    }
  });

  page.on('websocket', ws => {
    console.log('⚡ WEBSOCKET CONNECTED:', ws.url());
    ws.on('framesent', frame => console.log('WS SENT:', frame.payload));
    ws.on('framereceived', frame => console.log('WS RECEIVED:', frame.payload ? frame.payload.slice(0, 200) : ''));
  });

  await page.goto('https://www.skyexch.vip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Auto login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
    const userInput = await page.$('input[placeholder*="User"], input[name*="user"], input[type="text"]');
    const passInput = await page.$('input[type="password"]');
    if (userInput && passInput) {
      await userInput.fill('tsingh99');
      await passInput.fill('Abcd1234');
      const submitBtn = await page.$('button[type="submit"], button:has-text("Login")');
      if (submitBtn) await submitBtn.click();
      else await passInput.press('Enter');
      await page.waitForTimeout(4000);
    }
  } catch (e) {}

  console.log('Navigating to match 35916421 page...');
  await page.evaluate(() => {
    // Navigate inside skyexch SPA to match 35916421
    window.location.hash = '#/fullMarket/4/35916421';
  });
  await page.waitForTimeout(5000);

  console.log('\n--- NETWORK REQUEST LOG (Last 20 Requests) ---');
  networkLog.slice(-20).forEach(r => {
    console.log(`${r.method} ${r.url}`);
    if (r.postData) console.log('  Body:', r.postData);
  });

  await browser.close();
}

inspectSkyexchNetwork().catch(console.error);
