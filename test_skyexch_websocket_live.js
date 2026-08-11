const WebSocket = require('ws');

function testSkyexchWs() {
  console.log('⚡ Attempting direct WebSocket connection to SkyExchange data stream...');

  // URL discovered from skyexch network trace
  const wsUrl = 'wss://web.analysiscloud.info/m1uudG5uIU/?project=2b10f29087e021522948c7c5f3c5e124';
  const ws = new WebSocket(wsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.skyexch.vip'
    }
  });

  ws.on('open', () => {
    console.log('✅ Connected to SkyExchange WebSocket!');

    // Send initial configuration requests
    ws.send(JSON.stringify({ router: 'getHlsConfigSetting' }));
    ws.send(JSON.stringify({ router: 'getGroupResult', data: { type: '3r', group: 'dC_skyexch.vip', lines: 'bxawscf.skyexch.vip,bvincap.skyexch.vip' } }));
    ws.send(JSON.stringify({ router: 'subscribe', data: { eventId: '35916421' } }));
  });

  ws.on('message', (data) => {
    console.log(`\n[WS TICK ${new Date().toLocaleTimeString()}]`, data.toString().slice(0, 300));
  });

  ws.on('error', (err) => {
    console.error('❌ WS Error:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 WS Closed (code: ${code}, reason: ${reason})`);
  });
}

testSkyexchWs();
