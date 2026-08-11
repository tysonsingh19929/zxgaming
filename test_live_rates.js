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

  // Fetch all active Cricket events
  const liveResults = await page.evaluate(async () => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
    const form1 = new URLSearchParams();
    form1.append('eventType', '4');
    form1.append('eventTs', '-1');
    form1.append('marketTs', '-1');
    form1.append('selectionTs', '-1');
    form1.append('viewType', 'openDateTime');
    form1.append('competitionId', '-1');
    form1.append('pageNumber', '1');

    const res1 = await fetch(baseUrl + 'queryEventsWithMarket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form1.toString()
    });
    const data1 = await res1.json();
    const cricketEvents = data1.events || [];

    const out = [];
    for (const ev of cricketEvents) {
      const bmForm = new URLSearchParams();
      bmForm.append('eventId', ev.id.toString());
      bmForm.append('eventTs', '-1');
      bmForm.append('marketTs', '-1');
      bmForm.append('selectionTs', '-1');

      let bm = null;
      let fancy = null;

      try {
        const r1 = await fetch(baseUrl + 'queryBookMakerMarkets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: bmForm.toString()
        });
        if (r1.ok) bm = await r1.json();
      } catch (e) {}

      try {
        const r2 = await fetch(baseUrl + 'queryFancyBetMarkets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: bmForm.toString()
        });
        if (r2.ok) fancy = await r2.json();
      } catch (e) {}

      out.push({
        eventId: ev.id,
        eventName: ev.name,
        hasBookMaker: ev.hasBookMakerMarkets,
        hasFancy: ev.hasFancyBetMarkets,
        bmSelections: bm?.bookMakerSelection?.selections,
        fancyCount: Array.isArray(fancy) ? fancy.length : fancy?.fancyBetMarkets?.length,
        sampleFancyActive: (Array.isArray(fancy) ? fancy : fancy?.fancyBetMarkets || []).filter(f => f.runsNo > 0 || f.runsYes > 0 || f.oddsNo > 0)
      });
    }
    return out;
  });

  console.log('Live Rates Sample:', JSON.stringify(liveResults, null, 2));
  fs.writeFileSync('live_rates_test.json', JSON.stringify(liveResults, null, 2));
  await browser.close();
}

main().catch(console.error);
