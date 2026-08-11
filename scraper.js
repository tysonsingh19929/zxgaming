const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

const SPORTS = [
  { id: 4, name: 'Cricket' },
  { id: 1, name: 'Soccer' },
  { id: 2, name: 'Tennis' }
];

async function main() {
  console.log('======================================================');
  console.log('📡 REAL-TIME LIVE MARKET ODDS STREAM ACTIVE (Polling every 1 sec)');
  console.log('======================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Auto Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) await loginBtn.click();
    const userInput = await page.$('input[placeholder*="User"], input[name*="user"], input[type="text"]');
    const passInput = await page.$('input[type="password"]');
    if (userInput && passInput) {
      await userInput.fill(USERNAME);
      await passInput.fill(PASSWORD);
      const submitBtn = await page.$('button[type="submit"], button:has-text("Login")');
      if (submitBtn) await submitBtn.click();
      else await passInput.press('Enter');
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  let cycle = 1;

  async function pollCycle() {
    const timestamp = new Date().toISOString();
    const allEvents = [];
    const allMarketsSummary = [];

    for (const sport of SPORTS) {
      try {
        const sportData = await page.evaluate(async (sportId) => {
          const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';

          async function safeFetchJson(urlStr, bodyStr) {
            try {
              const res = await fetch(urlStr, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: bodyStr
              });
              if (!res.ok) return null;
              const text = await res.text();
              if (!text || text.trim() === '' || text.includes('<!DOCTYPE')) return null;
              return JSON.parse(text);
            } catch (e) {
              return null;
            }
          }

          const form1 = new URLSearchParams();
          form1.append('eventType', sportId.toString());
          form1.append('eventTs', '-1');
          form1.append('marketTs', '-1');
          form1.append('selectionTs', '-1');
          form1.append('viewType', 'openDateTime');
          form1.append('competitionId', '-1');
          form1.append('pageNumber', '1');

          const data1 = await safeFetchJson(baseUrl + 'queryEventsWithMarket', form1.toString());
          if (!data1 || !data1.events) return { events: [] };

          const eventIds = data1.events.map(e => e.id);
          const form2 = new URLSearchParams();
          form2.append('eventType', sportId.toString());
          form2.append('eventTs', '-1');
          form2.append('marketTs', '-1');
          form2.append('selectionTs', '-1');
          form2.append('viewType', 'openDateTime');
          form2.append('competitionId', '-1');
          form2.append('collectEventIds', eventIds.join(','));

          const data2 = await safeFetchJson(baseUrl + 'queryEventsWithMarket', form2.toString()) || data1;
          return { events: data2.events || [] };
        }, sport.id);

        if (sportData && sportData.events) {
          allEvents.push(...sportData.events);
        }
      } catch (err) {
        console.error(`❌ Error in cycle ${cycle} for ${sport.name}:`, err.message);
      }
    }

    const payload = {
      timestamp,
      cycle,
      totalEvents: allEvents.length,
      events: allEvents
    };

    fs.writeFileSync(path.join(__dirname, 'live_odds_stream.json'), JSON.stringify(payload, null, 2));

    console.log(`[Stream #${cycle}] ⏰ ${timestamp} | Active Live Events: ${allEvents.length}`);
    cycle++;
  }

  await pollCycle();
  setInterval(pollCycle, 1000);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
