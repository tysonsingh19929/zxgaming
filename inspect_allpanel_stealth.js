const { chromium } = require('playwright');
const path = require('path');

async function inspectAllpanelStealth() {
  console.log('🚀 Launching stealth browser to bypass Turnstile and view allpanel777.now UI...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://allpanel777.now', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  // Try login
  try {
    const userField = await page.$('input[placeholder*="User"], input[type="text"], input[name*="user"]');
    if (userField && await userField.isVisible()) {
      await userField.fill('Mb2b');
      await page.fill('input[type="password"]', 'Abcd4777');
      await page.click('button[type="submit"], button:has-text("Login"), .login-btn');
      await page.waitForTimeout(6000);
    }
  } catch (e) {}

  await page.goto('https://allpanel777.now/sport', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const screenshotPath = path.join(__dirname, 'allpanel777_dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved screenshot to: ${screenshotPath}`);

  const pageTitle = await page.title();
  console.log(`Page Title: ${pageTitle}`);

  await browser.close();
}

inspectAllpanelStealth().catch(console.error);
