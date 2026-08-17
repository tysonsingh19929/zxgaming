const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testPrintActiveMarket() {
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
  const sbMarkets = data.sportsBookMarket || [];
  
  const activeList = sbMarkets.filter(m => m.marketStatus === 1 && m.apiSiteStatus === 'ACTIVE');
  console.log('Total ACTIVE markets count:', activeList.length);
  
  if (activeList.length > 0) {
    console.log('Sample Active Market:', JSON.stringify(activeList[0], null, 2));
  }
}

testPrintActiveMarket().catch(console.error);
