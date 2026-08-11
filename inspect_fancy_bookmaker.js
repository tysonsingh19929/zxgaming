const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://www.skyexch.vip';

async function main() {
  console.log('🔍 Inspecting Fancy Bet and Bookmaker API Endpoints...');

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

  // Fetch active Cricket events first
  const eventData = await page.evaluate(async () => {
    const url = 'https://bxawscf.skyexch.vip/exchange/member/playerService/queryEventsWithMarket';
    const form = new URLSearchParams();
    form.append('eventType', '4'); // Cricket
    form.append('eventTs', '-1');
    form.append('marketTs', '-1');
    form.append('selectionTs', '-1');
    form.append('viewType', 'openDateTime');
    form.append('competitionId', '-1');
    form.append('pageNumber', '1');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form.toString()
    });
    return await res.json();
  });

  const cricketEvents = eventData.events || [];
  console.log(`Found ${cricketEvents.length} Cricket events to test Fancy/Bookmaker endpoints.`);

  // Test Fancy & Bookmaker requests for the first 5 events
  const marketResults = [];

  for (let i = 0; i < Math.min(cricketEvents.length, 10); i++) {
    const ev = cricketEvents[i];
    console.log(`\n📌 Testing Event [${ev.id}] - ${ev.name} (hasFancy: ${ev.hasFancyBetMarkets}, hasBookmaker: ${ev.hasBookMakerMarkets})`);

    const result = await page.evaluate(async (eventId) => {
      const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
      const form = new URLSearchParams();
      form.append('eventId', eventId.toString());

      let bookmaker = null;
      let fancy = null;

      try {
        const bmRes = await fetch(baseUrl + 'queryBookMakerMarkets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: form.toString()
        });
        if (bmRes.ok) bookmaker = await bmRes.json();
      } catch (e) {}

      try {
        const fancyRes = await fetch(baseUrl + 'queryFancyBetMarkets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: form.toString()
        });
        if (fancyRes.ok) fancy = await fancyRes.json();
      } catch (e) {}

      return { eventId, bookmaker, fancy };
    }, ev.id);

    marketResults.push({
      event: ev.name,
      eventId: ev.id,
      bookmaker: result.bookmaker,
      fancy: result.fancy
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'fancy_bookmaker_capture.json'),
    JSON.stringify(marketResults, null, 2)
  );

  console.log(`💾 Saved captured Fancy & Bookmaker payload structure to fancy_bookmaker_capture.json`);
  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
