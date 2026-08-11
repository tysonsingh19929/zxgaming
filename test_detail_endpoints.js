const { chromium } = require('playwright');
const fs = require('fs');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Test endpoints with eventId
  const candidateEndpoints = [
    'queryEventDetail',
    'queryMarketDetail',
    'queryFancyBetMarkets',
    'queryBookMakerMarkets',
    'queryEventWithMarketDetail',
    'queryMarketBook',
    'queryEvent'
  ];

  const results = await page.evaluate(async (endpoints) => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
    const testEventId = '35922516';
    const testResults = {};

    for (const ep of endpoints) {
      try {
        const form = new URLSearchParams();
        form.append('eventId', testEventId);
        form.append('eventType', '4');

        const res = await fetch(baseUrl + ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: form.toString()
        });
        testResults[ep] = { status: res.status, text: (await res.text()).substring(0, 300) };
      } catch (e) {
        testResults[ep] = { error: e.message };
      }
    }
    return testResults;
  }, candidateEndpoints);

  console.log('Endpoint Test Results:', JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch(console.error);
