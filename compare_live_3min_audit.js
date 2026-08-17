const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_EVENT_ID = '35920223';
const TARGET_EVENT_NAME = 'Birmingham Phoenix v MI London';
const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

const HTTP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.skyexch.vip',
  'Referer': 'https://www.skyexch.vip/',
  'Connection': 'keep-alive'
};
const httpsAgent = new https.Agent({ keepAlive: true });

async function safeFetchJson(endpoint, bodyParams) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: HTTP_HEADERS,
      body: bodyParams.toString(),
      agent: httpsAgent
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.includes('<!DOCTYPE')) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function run3MinAudit() {
  console.log('======================================================');
  console.log(`⏱️ STARTING 3-MINUTE CONTINUOUS LIVE AUDIT ON MATCH`);
  console.log(`🏏 ${TARGET_EVENT_NAME} (ID: ${TARGET_EVENT_ID})`);
  console.log('======================================================\n');

  const durationMs = 3 * 60 * 1000; // 3 minutes
  const intervalMs = 5000; // 5 seconds per tick
  const startTime = Date.now();
  let tick = 0;

  let totalTicks = 0;
  let moOrderMatches = 0;
  let bmRatesMatches = 0;
  let fancySessionsMatches = 0;

  while (Date.now() - startTime < durationMs) {
    tick++;
    totalTicks++;
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n------------------------------------------------------`);
    console.log(`⏱️ TICK #${tick} [Elapsed: ${elapsedSec}s / 180s]`);

    // 1. Fetch Local Server API snapshot
    const localRes = await fetch(`http://localhost:3000/api/event/${TARGET_EVENT_ID}`).catch(() => null);
    const localData = localRes && localRes.ok ? await localRes.json() : null;
    const localMarkets = localData && localData.event ? localData.event.markets || [] : [];

    // 2. Fetch SkyExchange Match Odds
    const formMo = new URLSearchParams({
      eventType: '4', eventTs: '0', marketTs: '0', selectionTs: '0',
      isDynamicUpdate: '1', viewType: 'openDateTime', competitionId: '-1', collectEventIds: TARGET_EVENT_ID
    });
    const skyMoData = await safeFetchJson('queryEventsWithMarket', formMo);

    // 3. Fetch SkyExchange Bookmaker
    const formBm = new URLSearchParams({ eventId: TARGET_EVENT_ID, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const skyBmData = await safeFetchJson('queryBookMakerMarkets', formBm);

    // 4. Fetch SkyExchange Fancy Bets
    const formFancy = new URLSearchParams({ eventId: TARGET_EVENT_ID, eventTs: '0', marketTs: '0', selectionTs: '0', isDynamicUpdate: '1' });
    const skyFancyData = await safeFetchJson('queryFancyBetMarkets', formFancy);

    // --- A. MATCH ODDS COMPARISON ---
    let skyMoRunners = [];
    if (skyMoData && skyMoData.events && skyMoData.events.length > 0) {
      const m = skyMoData.events[0].market || (skyMoData.events[0].markets ? skyMoData.events[0].markets[0] : null);
      if (m) skyMoRunners = (m.selections || m.runners || []).slice();
    }
    skyMoRunners.sort((a, b) => (a.sortPriority || a.sortOrder || 0) - (b.sortPriority || b.sortOrder || 0));

    const localMo = localMarkets.find(m => m.category === 'MATCH_ODDS');
    const localMoRunners = localMo ? (localMo.selections || []) : [];

    const skyMoNames = skyMoRunners.map(r => r.runnerName || r.name);
    const localMoNames = localMoRunners.map(r => r.runnerName);

    const isMoOrderMatch = skyMoNames.length > 0 && skyMoNames.every((val, index) => val === localMoNames[index]);
    if (isMoOrderMatch) moOrderMatches++;

    console.log(`  📈 MATCH ODDS:`);
    console.log(`     SkyExch  -> ${skyMoNames.map((n, i) => `${n}: [Back ${skyMoRunners[i]?.availableToBack?.[0]?.price || '-'}/Lay ${skyMoRunners[i]?.availableToLay?.[0]?.price || '-'}]`).join(' | ')}`);
    console.log(`     Localhost -> ${localMoNames.map((n, i) => `${n}: [Back ${localMoRunners[i]?.availableToBack?.[0]?.price || '-'}/Lay ${localMoRunners[i]?.availableToLay?.[0]?.price || '-'}]`).join(' | ')}`);
    console.log(`     Order Parity: ${isMoOrderMatch ? '✅ MATCH' : '⚠️ DIFFERENT (Updating...)'}`);

    // --- B. BOOKMAKER COMPARISON ---
    let skyBmSelections = [];
    if (skyBmData && skyBmData.bookMakerSelection && skyBmData.bookMakerSelection.selections) {
      skyBmSelections = skyBmData.bookMakerSelection.selections;
    }
    const localBm = localMarkets.find(m => m.category === 'BOOKMAKER');
    const localBmSelections = localBm ? (localBm.selections || []) : [];

    let isBmRatesMatch = true;
    console.log(`  📚 BOOKMAKER:`);
    skyBmSelections.forEach(s => {
      let bArr = [], lArr = [];
      try { bArr = JSON.parse(s.backOddsInfo || '[]'); } catch (e) {}
      try { lArr = JSON.parse(s.layOddsInfo || '[]'); } catch (e) {}
      const skyBack = bArr[0] ? Math.round(parseFloat(bArr[0])).toString() : '-';
      const skyLay = lArr[0] ? Math.round(parseFloat(lArr[0])).toString() : '-';

      const localSel = localBmSelections.find(l => l.runnerName === s.runnerName);
      const locBack = localSel ? (localSel.backPrice || (localSel.availableToBack?.[0]?.price) || '-') : '-';
      const locLay = localSel ? (localSel.layPrice || (localSel.availableToLay?.[0]?.price) || '-') : '-';

      console.log(`     ${s.runnerName} | SkyExch: [${skyBack}/${skyLay}] vs Localhost: [${locBack}/${locLay}]`);
      if (skyBack !== locBack || skyLay !== locLay) isBmRatesMatch = false;
    });

    if (isBmRatesMatch && skyBmSelections.length > 0) bmRatesMatches++;
    console.log(`     Rate Parity: ${isBmRatesMatch ? '✅ MATCH' : '⚠️ SYNCING...'}`);

    // --- C. FANCY BET SESSIONS COMPARISON ---
    const skyFancyList = Array.isArray(skyFancyData) ? skyFancyData : (skyFancyData ? skyFancyData.fancyBetMarkets || [] : []);
    const localFancyList = localMarkets.filter(m => m.category === 'FANCY');

    console.log(`  ⭐ FANCY BETS: Active SkyExch Sessions: ${skyFancyList.length} | Localhost Sessions: ${localFancyList.length}`);
    let sampleFancyMatch = 0;
    const skyActiveSessions = skyFancyList.filter(f => f.status === 2 || f.status === 10 || f.status === 18);

    skyActiveSessions.slice(0, 3).forEach(f => {
      const locF = localFancyList.find(l => String(l.marketId) === String(f.marketId) || l.marketName === f.marketName);
      if (locF) {
        console.log(`     Session "${f.marketName}" -> SkyExch: [Runs ${f.runsNo}/${f.runsYes}] vs Localhost: [Runs ${locF.runsNo}/${locF.runsYes}]`);
        if (f.runsNo === locF.runsNo && f.runsYes === locF.runsYes) sampleFancyMatch++;
      }
    });

    if (sampleFancyMatch > 0) fancySessionsMatches++;

    await new Promise(r => setTimeout(r, intervalMs));
  }

  console.log('\n======================================================');
  console.log('✅ 3-MINUTE CONTINUOUS LIVE AUDIT COMPLETE');
  console.log('======================================================');
  console.log(`📊 Total Audit Samples Taken: ${totalTicks}`);
  console.log(`📈 Match Odds Order Parity: ${Math.round((moOrderMatches / totalTicks) * 100)}%`);
  console.log(`📚 Bookmaker Rate Parity: ${Math.round((bmRatesMatches / totalTicks) * 100)}%`);
  console.log(`⭐ Fancy Bet Session Parity: ${Math.round((fancySessionsMatches / totalTicks) * 100)}%`);
  console.log('======================================================\n');
}

run3MinAudit().catch(console.error);
