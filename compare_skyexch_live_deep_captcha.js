const { chromium } = require('playwright');
const path = require('path');

async function runDeepComparisonCaptcha() {
  console.log('======================================================');
  console.log('🔍 STARTING LIVE CAPTCHA LOGIN & DATA VERIFICATION');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.skyexch.vip/#/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Read validation code text from DOM if visible
    const validationCode = await page.evaluate(() => {
      const codeEl = document.querySelector('.valid-code, #validCode, span[class*="code"], div[class*="code"]');
      if (codeEl) return codeEl.innerText.trim();
      
      const valInput = document.querySelector('input[placeholder*="Validation"], input[placeholder*="Code"]');
      if (valInput && valInput.previousElementSibling) {
        return valInput.previousElementSibling.innerText.trim();
      }
      return null;
    });

    console.log(`Detected SkyExchange Validation Code: ${validationCode}`);

    // Fill login
    const userField = await page.$('input[placeholder*="Username"], input[type="text"]');
    if (userField) {
      await userField.fill('tsingh99');
      await page.fill('input[type="password"]', 'Abcd1234');
      
      const captchaInput = await page.$('input[placeholder*="Validation"], input[placeholder*="Code"]');
      if (captchaInput && validationCode) {
        await captchaInput.fill(validationCode);
      }
      
      await page.click('button[type="submit"], button:has-text("Login"), .login-btn');
      await page.waitForTimeout(4000);
    }

    console.log('Current URL after login attempt:', page.url());

    // Navigate to full market page
    await page.goto('https://www.skyexch.vip/#/fullMarket/35924127', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(5000);

    const screenshotPath = path.join(__dirname, 'skyexch_live_comparison_logged.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Saved logged screenshot to: ${screenshotPath}`);

    const extractedText = await page.evaluate(() => {
      const rows = [];
      document.querySelectorAll('.market-match-odds, .market-table, .bookmaker-table, .fancy-table, tr').forEach(el => {
        const txt = el.innerText.replace(/\s+/g, ' ').trim();
        if (txt && txt.length > 5 && txt.length < 150) rows.push(txt);
      });
      return rows.slice(0, 30);
    });

    console.log('\n--- LIVE SKYEXCH.VIP MARKET TEXT ---');
    extractedText.forEach(row => console.log(`   ${row}`));

  } catch (e) {
    console.error('Error during captcha comparison:', e.message);
  } finally {
    await browser.close();
  }
}

runDeepComparisonCaptcha().catch(console.error);
