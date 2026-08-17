const API_BASE = 'https://saapipl.skyexch.vip/exchange/member/playerService/';

async function testSbParamsGrid() {
  const eventId = '35938017';
  
  for (const siteType of ['1', '2', '3']) {
    for (const isDyn of ['0', '1']) {
      const form = new URLSearchParams({
        eventId,
        eventType: '4',
        apiSiteType: siteType,
        isDynamicUpdate: isDyn,
        eventTs: '0',
        marketTs: '0',
        selectionTs: '0'
      });

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

      const text = await res.text();
      console.log(`siteType="${siteType}", isDyn="${isDyn}" -> Length ${text.length}`);
      if (text.length > 500) {
        const data = JSON.parse(text);
        const keys = Object.keys(data);
        console.log('   Top keys:', keys);
        if (data.sportsBookMarket && data.sportsBookMarket.length > 0) {
          const sample = data.sportsBookMarket.find(m => m.marketStatus === 1) || data.sportsBookMarket[0];
          console.log('   Sample market keys:', Object.keys(sample));
          console.log('   Sample market:', JSON.stringify(sample, null, 2).slice(0, 400));
        }
      }
    }
  }
}

testSbParamsGrid().catch(console.error);
