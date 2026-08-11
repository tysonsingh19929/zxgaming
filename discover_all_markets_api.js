const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'https://www.skyexch.vip';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
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

  const results = await page.evaluate(async () => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
    const eventId = '35871839'; // Gil Vicente v Rio Ave (Soccer)

    const tests = [
      { name: 'param_eventId_only', body: `eventId=${eventId}` },
      { name: 'param_eventId_eventType', body: `eventId=${eventId}&eventType=1` },
      { name: 'param_eventId_collect', body: `collectEventIds=${eventId}` },
      { name: 'param_isHighLight_0', body: `eventId=${eventId}&eventType=1&isHighLight=0` },
      { name: 'param_no_viewType', body: `eventType=1&collectEventIds=${eventId}` },
      { name: 'param_viewType_event', body: `eventType=1&eventId=${eventId}&viewType=event` }
    ];

    const out = {};
    for (const t of tests) {
      try {
        const res = await fetch(baseUrl + 'queryEventsWithMarket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: t.body
        });
        if (res.ok) {
          const json = await res.json();
          const markets = json.events?.[0]?.markets || [];
          out[t.name] = {
            count: markets.length,
            names: markets.map(m => m.marketName || m.name)
          };
        } else {
          out[t.name] = { status: res.status };
        }
      } catch (e) {
        out[t.name] = { error: e.message };
      }
    }
    return out;
  });

  console.log('Discovery Results:', JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch(console.error);
