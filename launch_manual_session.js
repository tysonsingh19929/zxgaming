const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { saveMemberSession } = require('./config');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function launchManualLoginHelper() {
  console.log("==========================================================================");
  console.log("🔐 SKYEXCHANGE MANUAL LOGIN SESSION CAPTURE TOOL");
  console.log("Opening Chrome window for manual captcha login...");
  console.log("==========================================================================\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-web-security', '--no-sandbox']
  });

  const page = (await browser.pages())[0] || await browser.newPage();

  try {
    console.log("1. Navigating to https://skyinplay.club...");
    await page.goto('https://skyinplay.club/', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

    console.log("\n==========================================================================");
    console.log("👉 CHROME IS OPEN!");
    console.log("   1. Please type Username (tsn019), Password (Abcd1234), and CAPTCHA code.");
    console.log("   2. Click the LOGIN button.");
    console.log("   3. Once logged in, press [ENTER] in this command prompt.");
    console.log("==========================================================================\n");

    await askQuestion("Press [ENTER] after completing login in Chrome to save your session... ");

    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log(`\n✅ Captured ${cookies.length} Session Cookies from Chrome!`);
    console.log(`   Cookie String: "${cookieStr.slice(0, 100)}..."`);

    const sessionObj = {
      username: 'tsn019',
      cookie: cookieStr,
      updatedAt: new Date().toISOString()
    };

    saveMemberSession(sessionObj);
    console.log("✅ Member Session saved to 'member_session.json'!");

    try {
      await fetch('http://localhost:3000/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookieStr, adminSecret: 'admin_sky_secret_2026' })
      });
      console.log("✅ Synced active session to running Scraper Engine at http://localhost:3000!");
    } catch (e) {
      console.log("   (Local server not active, session saved to disk for next start).");
    }

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    console.log("\nSession captured successfully. Closing Chrome helper window...");
    await browser.close();
  }
}

launchManualLoginHelper().catch(console.error);
