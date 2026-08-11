const { chromium } = require('playwright');

async function debugFullMarkets() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.skyexch.vip');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async (eventId) => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';

    async function safeFetchJson(urlStr, bodyStr) {
      const res = await fetch(urlStr, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: bodyStr
      });
      return await res.json();
    }

    const form = new URLSearchParams();
    form.append('eventType', '4');
    form.append('eventTs', '-1');
    form.append('marketTs', '-1');
    form.append('selectionTs', '-1');
    form.append('viewType', 'openDateTime');
    form.append('competitionId', '-1');
    form.append('collectEventIds', eventId);

    const moData = await safeFetchJson(baseUrl + 'queryEventsWithMarket', form.toString());
    const ev = (moData && moData.events) ? moData.events.find(e => String(e.id) === String(eventId)) : null;

    return {
      eventFound: Boolean(ev),
      marketsCount: ev ? (ev.markets || ev.marketList || [ev.market]).length : 0,
      marketSample: ev ? (ev.markets || [ev.market])[0] : null
    };
  }, '35916421');

  console.log('Full Markets Test Result:', JSON.stringify(result, null, 2));
  await browser.close();
}

debugFullMarkets().catch(console.error);
