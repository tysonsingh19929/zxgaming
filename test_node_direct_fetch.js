async function testNodeDirectFetch() {
  const baseUrl = 'https://bxawscf.skyexch.vip/exchange/member/playerService/';

  // Pass 1: Query events
  const form1 = new URLSearchParams();
  form1.append('eventType', '4');
  form1.append('eventTs', '-1');
  form1.append('marketTs', '-1');
  form1.append('selectionTs', '-1');
  form1.append('viewType', 'openDateTime');
  form1.append('competitionId', '-1');
  form1.append('collectEventIds', '35916421');

  const res1 = await fetch(baseUrl + 'queryEventsWithMarket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.skyexch.vip',
      'Referer': 'https://www.skyexch.vip/'
    },
    body: form1.toString()
  });

  const data1 = await res1.json();
  console.log('Node Direct Fetch Result:', JSON.stringify(data1, null, 2).slice(0, 1000));
}

testNodeDirectFetch().catch(console.error);
