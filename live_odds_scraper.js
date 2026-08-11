const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = 'tsingh99';
const PASSWORD = 'Abcd1234';
const TARGET_URL = 'https://www.skyexch.vip';

async function main() {
  console.log('🚀 Starting Live 1-Second Odds Harvester...');

  const browser = await chromium.launch({
    headless: false, // Run headful to render full Angular/Vue market tables
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Login
  try {
    const loginBtn = await page.$('a:has-text("Login"), button:has-text("Login"), .login-btn');
    if (loginBtn && await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(1000);
    }

    const userInput = await page.$('input[placeholder*="User"], input[placeholder*="ID"], input[name*="user"], #userId, input[type="text"]');
    const passInput = await page.$('input[type="password"]');

    if (userInput && passInput) {
      console.log('🔑 Logging in...');
      await userInput.fill(USERNAME);
      await passInput.fill(PASSWORD);
      await page.waitForTimeout(500);

      const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), .submit-btn');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passInput.press('Enter');
      }
      await page.waitForTimeout(4000);
    }
  } catch (e) {}

  // Go to In-Play tab
  console.log('🎯 Navigating to In-Play matches...');
  const inPlayTab = page.locator('text="In-Play"').first();
  if (await inPlayTab.count() > 0) {
    await inPlayTab.click();
    await page.waitForTimeout(3000);
  }

  // Find live matches
  const matchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
  console.log(`Found ${matchLinks.length} live matches on page.`);

  if (matchLinks.length === 0) {
    console.log('⚠️ No live matches directly clickable, searching for sport links...');
    const cricketTab = page.locator('text="Cricket"').first();
    if (await cricketTab.count() > 0) {
      await cricketTab.click();
      await page.waitForTimeout(3000);
    }
  }

  // Click into first live event
  const currentMatchLinks = await page.$$('a[href*="event"], a[href*="market"], tr.event-row, .game-name, .event-name');
  if (currentMatchLinks.length > 0) {
    console.log('🔗 Opening Live Match Event Page...');
    await currentMatchLinks[0].click();
    await page.waitForTimeout(4000);
  }

  console.log('\n======================================================');
  console.log('📡 Streaming Real-Time Live Odds (Updating Every 1s)...');
  console.log('======================================================\n');

  // Stream live odds every 1 second for 30 cycles
  for (let cycle = 1; cycle <= 30; cycle++) {
    const liveSnapshot = await page.evaluate(() => {
      const matchName = document.querySelector('.event-name, .match-title, h2, h3')?.innerText || 'Live Match';
      const marketsData = [];

      // Select all market blocks (Match Odds, Bookmaker, Fancy Bet, etc.)
      const marketBlocks = document.querySelectorAll('.market-container, .game-wrap, .bets-wrap, table, .market-table');
      
      marketBlocks.forEach((block, index) => {
        const title = block.querySelector('.market-title, .title, header, th')?.innerText || `Market #${index + 1}`;
        const rows = block.querySelectorAll('tr, .runner-row, .bet-row');
        const runners = [];

        rows.forEach(row => {
          const runnerName = row.querySelector('.runner-name, .team-name, td:first-child')?.innerText?.trim();
          if (runnerName) {
            // Find back & lay odds cells
            const backOdds = Array.from(row.querySelectorAll('.back, .back1, .back-cell, td.back')).map(el => el.innerText.trim()).filter(Boolean);
            const layOdds = Array.from(row.querySelectorAll('.lay, .lay1, .lay-cell, td.lay')).map(el => el.innerText.trim()).filter(Boolean);

            runners.push({
              runnerName,
              backOdds: backOdds.length ? backOdds : ['N/A'],
              layOdds: layOdds.length ? layOdds : ['N/A']
            });
          }
        });

        if (runners.length > 0) {
          marketsData.push({
            marketTitle: title.replace(/\n/g, ' '),
            runners
          });
        }
      });

      return {
        timestamp: new Date().toISOString(),
        matchName,
        markets: marketsData
      };
    });

    console.log(`[Cycle ${cycle}/30] ⏰ ${liveSnapshot.timestamp} | Event: ${liveSnapshot.matchName}`);
    if (liveSnapshot.markets.length > 0) {
      liveSnapshot.markets.forEach(m => {
        console.log(`  📌 Market: ${m.marketTitle}`);
        m.runners.forEach(r => {
          console.log(`     🔹 ${r.runnerName} | Back: [${r.backOdds.join(' | ')}] | Lay: [${r.layOdds.join(' | ')}]`);
        });
      });
    } else {
      console.log('   (Waiting for DOM table render...)');
    }

    // Save live stream update to file
    fs.writeFileSync(
      path.join(__dirname, 'live_realtime_odds.json'),
      JSON.stringify(liveSnapshot, null, 2)
    );

    await page.waitForTimeout(1000); // 1 second interval
  }

  await browser.close();
  console.log('🏁 Real-time live odds harvester completed cycle.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
