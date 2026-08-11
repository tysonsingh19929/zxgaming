const fs = require('fs');

async function downloadAndInspectJs() {
  const jsUrl = 'https://www.skyexch.vip/assets/4.42.0-exchange.DN67Itf4.js';
  const constUrl = 'https://www.skyexch.vip/assets/4.42.0-exchangeMarketStatusConst.C6hiNqfU.js';

  console.log('Fetching SkyExchange JS bundles...');
  const res1 = await fetch(jsUrl);
  const text1 = await res1.text();

  const res2 = await fetch(constUrl);
  const text2 = await res2.text();

  fs.writeFileSync('skyexch_bundle.js', text1);
  fs.writeFileSync('skyexch_const.js', text2);

  console.log('Downloaded skyexch_bundle.js (Bytes:', text1.length, ') and skyexch_const.js (Bytes:', text2.length, ')');

  // Search for status mappings, fancy markets, bookmaker, polling interval, etc.
  const statusMatches = text2.match(/[a-zA-Z0-9_]+:\s*\{[^}]+\}/g) || [];
  console.log('\n--- STATUS CONSTANTS ---');
  statusMatches.forEach(m => console.log(m.slice(0, 150)));

  // Search for queryBookMakerMarkets or fancy status logic in bundle
  const fancyStatusIdx = text1.indexOf('fancy');
  console.log('\n--- FANCY OCCURRENCES IN BUNDLE ---');
  let idx = 0;
  while ((idx = text1.indexOf('fancy', idx + 1)) !== -1) {
    const snippet = text1.slice(Math.max(0, idx - 50), Math.min(text1.length, idx + 150));
    if (snippet.includes('status') || snippet.includes('Ball') || snippet.includes('Suspend') || snippet.includes('runs')) {
      console.log('Snippet:', snippet.replace(/\n/g, ' '));
    }
  }
}

downloadAndInspectJs().catch(console.error);
