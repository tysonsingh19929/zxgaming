const { chromium } = require('playwright');

async function testFastFocused() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.skyexch.vip');
  await page.waitForTimeout(2000);

  const res = await page.evaluate(async () => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
    const form = new URLSearchParams();
    form.append('eventType', '4');
    form.append('eventTs', '-1');
    form.append('marketTs', '-1');
    form.append('selectionTs', '-1');
    form.append('viewType', 'openDateTime');
    form.append('competitionId', '-1');
    form.append('collectEventIds', '35916421');

    const response = await fetch(baseUrl + 'queryEventsWithMarket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form.toString()
    });
    const data = await response.json();
    const match = (data.events || []).find(e => String(e.id) === '35916421');
    return match;
  });

  console.log('Target Event Found:', JSON.stringify(res, null, 2).slice(0, 1000));
  await browser.close();
}

testFastFocused();
