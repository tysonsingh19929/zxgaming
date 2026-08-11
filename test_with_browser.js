const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.skyexch.vip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Login
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
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  const result = await page.evaluate(async () => {
    const url = 'https://bxawscf.skyexch.vip/exchange/member/playerService/queryEventsWithMarket';
    const eventId = '35871839'; // Gil Vicente v Rio Ave

    const tests = [
      { name: '1. eventId_and_collectEventIds', body: `eventType=1&eventId=${eventId}&collectEventIds=${eventId}` },
      { name: '2. eventId_and_viewType_event', body: `eventType=1&eventId=${eventId}&viewType=openDateTime` },
      { name: '3. collectEventIds_only', body: `eventType=1&eventTs=-1&marketTs=-1&selectionTs=-1&viewType=openDateTime&competitionId=-1&collectEventIds=${eventId}` },
      { name: '4. pageNumber_none', body: `eventType=1&collectEventIds=${eventId}` }
    ];

    const out = [];
    for (const t of tests) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: t.body
        });
        const data = await res.json();
        const ev = data.events?.[0];
        const markets = ev?.markets || [];
        out.push({
          testName: t.name,
          marketsCount: markets.length,
          markets: markets.map(m => ({ marketId: m.marketId, name: m.marketName || m.name, type: m.marketType, selectionsCount: m.selections?.length }))
        });
      } catch (e) {
        out.push({ testName: t.name, error: e.message });
      }
    }
    return out;
  });

  console.log('Results:', JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch(console.error);
