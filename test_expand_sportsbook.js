const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

function expandMarketRunners(m) {
  let specifier = {};
  try { specifier = JSON.parse(m.apiSiteSpecifier || '{}'); } catch (e) {}

  const name = m.marketName || '';

  // 1. Run Range Markets (e.g. "1st innings over 14 - Barbados Tridents run range")
  if (name.includes('run range') || (specifier.variant && specifier.variant.includes('run_range'))) {
    const ranges = ['0-3', '4', '5', '6', '7', '8', '9', '10', '11', '12+'];
    const sampleOdds = [8.4, 12.5, 10.0, 9.2, 8.8, 8.8, 9.0, 9.8, 11.0, 2.44];
    return ranges.map((r, i) => ({
      selectionId: `${m.id}_${i}`,
      runnerName: r,
      odds: sampleOdds[i] || 9.0,
      isActive: true
    }));
  }

  // 2. Over / Under Total Markets (e.g. "1st innings over 13 - Barbados Tridents total")
  if (name.includes('total') && specifier.total) {
    return [
      { selectionId: `${m.id}_0`, runnerName: `Over ${specifier.total}`, odds: 1.94, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: `Under ${specifier.total}`, odds: 1.77, isActive: true }
    ];
  }

  // 3. Both Teams to Score / Yes/No Markets
  if (name.includes('Both teams to score') || name.includes('Will there be a tie') || name.includes('to be a wicket')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Yes', odds: 6.00, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'No', odds: 1.15, isActive: true }
    ];
  }

  // 4. Default 2-runner market
  return [
    { selectionId: `${m.id}_0`, runnerName: 'Over / Yes', odds: 1.85, isActive: true },
    { selectionId: `${m.id}_1`, runnerName: 'Under / No', odds: 1.85, isActive: true }
  ];
}

async function testExpandSportsbook() {
  const form = new URLSearchParams({ eventId: '35938017', eventType: '4', apiSiteType: '2' });

  const res = await fetch(API_BASE + 'querySportsBookEvent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Origin': 'https://www.skyexch.vip',
      'Referer': 'https://www.skyexch.vip/'
    },
    body: form.toString()
  });

  const data = await res.json();
  const sbMarkets = (data.sportsBookMarket || []).filter(m => m.marketStatus === 1 || m.apiSiteStatus === 'ACTIVE');

  console.log(`Testing runner expansion on ${sbMarkets.length} active Sportsbook markets:\n`);
  
  sbMarkets.slice(0, 5).forEach((m, idx) => {
    console.log(`Market #${idx + 1}: "${m.marketName}"`);
    const selections = expandMarketRunners(m);
    console.log('   Expanded Selections:', selections);
  });
}

testExpandSportsbook().catch(console.error);
