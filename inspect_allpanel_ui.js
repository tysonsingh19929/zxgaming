const { chromium } = require('playwright');
const path = require('path');

async function inspectAllpanelUi() {
  console.log('🚀 Launching Playwright browser to inspect allpanel777.now UI design...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://allpanel777.now/sport', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Navigation to /sport direct redirecting to login...');
  }

  // Check login
  try {
    const userField = await page.$('input[placeholder*="User"], input[type="text"], input[name*="user"]');
    if (userField) {
      console.log('Filling login credentials Mb2b / Abcd4777...');
      await userField.fill('Mb2b');
      await page.fill('input[type="password"]', 'Abcd4777');
      await page.click('button[type="submit"], button:has-text("Login"), .login-btn');
      await page.waitForTimeout(5000);
    }
  } catch (e) {
    console.error('Login fill error:', e.message);
  }

  // Take screenshot of sport dashboard
  const screenshotPath = path.join(__dirname, 'allpanel777_dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved screenshot to: ${screenshotPath}`);

  // Dump HTML layout structure
  const htmlSnippet = await page.evaluate(() => {
    const main = document.querySelector('body');
    return main ? main.innerHTML.slice(0, 2000) : '';
  });
  console.log('\n--- ALLPANEL777 HTML SNIPPET ---');
  console.log(htmlSnippet);

  await browser.close();
}

inspectAllpanelUi().catch(console.error);
