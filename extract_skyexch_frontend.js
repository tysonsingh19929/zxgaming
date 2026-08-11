const { chromium } = require('playwright');

async function extractSkyexchFrontendCode() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.skyexch.vip/#/fullMarket/4/35916421', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const windowKeys = await page.evaluate(() => {
    return Object.keys(window).filter(k => k.includes('sky') || k.includes('Market') || k.includes('Const') || k.includes('App'));
  });

  console.log('Window keys:', windowKeys);

  // Extract market rendering / status functions if any
  const statusLogic = await page.evaluate(() => {
    // Let's inspect Angular/Vue/React component scope or global helpers
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
    return scripts;
  });

  console.log('Scripts:', statusLogic);

  await browser.close();
}

extractSkyexchFrontendCode().catch(console.error);
