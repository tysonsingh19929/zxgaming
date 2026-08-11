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

  const result = await page.evaluate(async () => {
    const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';
    
    // Step 1: Query initial Sportsbook event structure
    const form1 = new URLSearchParams();
    form1.append('eventId', '35916421');
    form1.append('apiSiteType', '2');
    form1.append('version', '0');
    form1.append('marketIds', ',');
    form1.append('selectionTsList', ',');
    form1.append('isDynamicUpdate', '0');

    const res1 = await fetch(baseUrl + 'querySportsBookEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form1.toString()
    });
    const data1 = await res1.json();
    const markets = data1.sportsBookMarket || [];
    
    // Extract first 15 active market IDs
    const activeMarketIds = markets.filter(m => m.marketStatus === 1).slice(0, 15).map(m => m.id);

    // Step 2: Query Sportsbook event with marketIds to get selections & odds
    const form2 = new URLSearchParams();
    form2.append('eventId', '35916421');
    form2.append('apiSiteType', '2');
    form2.append('version', data1.eventUpdateDate || '0');
    form2.append('marketIds', activeMarketIds.join(',') + ',');
    form2.append('selectionTsList', activeMarketIds.map(() => '-1').join(',') + ',');
    form2.append('isDynamicUpdate', '0');

    const res2 = await fetch(baseUrl + 'querySportsBookEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form2.toString()
    });
    const data2 = await res2.json();

    return {
      step1MarketCount: markets.length,
      step2ResultKeys: Object.keys(data2),
      sportsBookSelection: data2.sportsBookSelection,
      sampleSelections: data2.sportsBookSelection || data2.selections || data2
    };
  });

  console.log('Sportsbook Selections Test:', JSON.stringify(result, null, 2).substring(0, 1500));
  fs.writeFileSync('sportsbook_selections_result.json', JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch(console.error);
