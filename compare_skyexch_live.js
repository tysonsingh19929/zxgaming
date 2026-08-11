const { chromium } = require('playwright');

async function compareSkyexchLive() {
  console.log('🚀 Launching browser to log in to SkyExchange and inspect live APIs...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiResponses = {};

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('queryEventsWithMarket') || url.includes('queryBookMakerMarkets') || url.includes('queryFancyBetMarkets') || url.includes('querySportsBookEvent')) {
      try {
        const json = await res.json();
        const endpoint = url.split('/').pop();
        apiResponses[endpoint] = json;
        console.log(`\n================ API RESPONDED: ${endpoint} ================`);
      } catch (e) {}
    }
  });

  await page.goto('https://www.skyexch.vip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Perform login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
    await page.fill('input[placeholder*="User"], input[name*="user"], input[type="text"]', 'tsingh99');
    await page.fill('input[type="password"]', 'Abcd1234');
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForTimeout(4000);
  } catch (e) {
    console.log('Login step error or already logged in:', e.message);
  }

  console.log('Navigating to live match #/fullMarket/4/35916421 ...');
  await page.goto('https://www.skyexch.vip/#/fullMarket/4/35916421');
  await page.waitForTimeout(6000);

  console.log('\n--- 1. BOOKMAKER API RESPONSE ---');
  if (apiResponses['queryBookMakerMarkets']) {
    console.log(JSON.stringify(apiResponses['queryBookMakerMarkets'], null, 2).slice(0, 1000));
  } else {
    console.log('No queryBookMakerMarkets captured');
  }

  console.log('\n--- 2. FANCY BET API RESPONSE (Sample Markets) ---');
  if (apiResponses['queryFancyBetMarkets']) {
    const list = Array.isArray(apiResponses['queryFancyBetMarkets']) 
      ? apiResponses['queryFancyBetMarkets'] 
      : (apiResponses['queryFancyBetMarkets'].fancyBetMarkets || []);
    
    console.log(`Total Fancy Markets captured: ${list.length}`);
    const samples = list.filter(f => f.marketName && (
      f.marketName.includes('R Cornwall') || 
      f.marketName.includes('6 Over ABF') || 
      f.marketName.includes('Boundaries')
    ));
    console.log(JSON.stringify(samples, null, 2));
  } else {
    console.log('No queryFancyBetMarkets captured');
  }

  await browser.close();
}

compareSkyexchLive().catch(console.error);
