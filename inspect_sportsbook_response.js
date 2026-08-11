const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

  const responseData = await page.evaluate(async () => {
    const url = 'https://bxawscf.skyexch.vip/exchange/member/playerService/querySportsBookEvent';
    const form = new URLSearchParams();
    form.append('eventId', '35916421');
    form.append('apiSiteType', '2');
    form.append('version', '0');
    form.append('marketIds', ',');
    form.append('selectionTsList', ',');
    form.append('isDynamicUpdate', '0');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form.toString()
    });
    return await res.json();
  });

  fs.writeFileSync(
    path.join(__dirname, 'sportsbook_event_captured.json'),
    JSON.stringify(responseData, null, 2)
  );

  console.log('Saved sportsbook_event_captured.json successfully!');
  await browser.close();
}

main().catch(console.error);
