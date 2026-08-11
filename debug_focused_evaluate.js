const { chromium } = require('playwright');

async function debugFocusedEvaluate() {
  console.log('Starting debug evaluate...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to skyexch.vip...');
  await page.goto('https://www.skyexch.vip');
  await page.waitForTimeout(3000);

  // Auto login
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

  const result = await page.evaluate(async (eventId) => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';

    async function safeFetchJson(urlStr, bodyStr) {
      try {
        const res = await fetch(urlStr, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: bodyStr
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        const text = await res.text();
        if (!text || text.trim() === '' || text.includes('<!DOCTYPE')) return { error: 'Empty or HTML text' };
        return JSON.parse(text);
      } catch (e) {
        return { error: e.message };
      }
    }

    const formMo = new URLSearchParams();
    formMo.append('eventType', '4');
    formMo.append('eventTs', '-1');
    formMo.append('marketTs', '-1');
    formMo.append('selectionTs', '-1');
    formMo.append('viewType', 'openDateTime');
    formMo.append('competitionId', '-1');

    const moData = await safeFetchJson(baseUrl + 'queryEventsWithMarket', formMo.toString());
    return { moData, eventId };
  }, '35916421');

  console.log('Evaluate Output:', JSON.stringify(result, null, 2).slice(0, 1000));
  await browser.close();
}

debugFocusedEvaluate().catch(console.error);
