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

  // Test querying event 35871839 (Gil Vicente v Rio Ave - Soccer) and 35916421 (Antigua & Barbuda Falcons) with different params
  const testResults = await page.evaluate(async () => {
    const url = 'https://bxawscf.skyexch.vip/exchange/member/playerService/queryEventsWithMarket';
    const eventId = '35871839'; // Soccer match with many markets
    
    const attempts = {};

    // Attempt A: collectEventIds = 35871839
    const formA = new URLSearchParams();
    formA.append('eventType', '1');
    formA.append('eventTs', '-1');
    formA.append('marketTs', '-1');
    formA.append('selectionTs', '-1');
    formA.append('eventId', eventId);
    formA.append('collectEventIds', eventId);

    const resA = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: formA.toString() });
    attempts.attemptA = await resA.json();

    // Attempt B: queryEventDetail endpoint or eventId param without collectEventIds
    const formB = new URLSearchParams();
    formB.append('eventType', '1');
    formB.append('eventId', eventId);
    formB.append('eventTs', '-1');
    formB.append('marketTs', '-1');
    formB.append('selectionTs', '-1');
    
    const resB = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: formB.toString() });
    attempts.attemptB = await resB.json();

    // Attempt C: searchEvents or queryEvents
    const formC = new URLSearchParams();
    formC.append('eventId', eventId);
    const resC = await fetch('https://bxawscf.skyexch.vip/exchange/member/playerService/queryEvents', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: formC.toString() });
    attempts.attemptC = await resC.json();

    return attempts;
  });

  console.log('Attempt A (collectEventIds) market count:', testResults.attemptA.events?.[0]?.markets?.length);
  if (testResults.attemptA.events?.[0]?.markets) {
    console.log('Markets List:', testResults.attemptA.events[0].markets.map(m => m.marketName || m.name));
  }

  console.log('\nAttempt B (eventId) market count:', testResults.attemptB.events?.[0]?.markets?.length);
  if (testResults.attemptB.events?.[0]?.markets) {
    console.log('Markets List:', testResults.attemptB.events[0].markets.map(m => m.marketName || m.name));
  }

  fs.writeFileSync('test_all_markets_result.json', JSON.stringify(testResults, null, 2));
  await browser.close();
}

main().catch(console.error);
