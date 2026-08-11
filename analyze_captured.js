const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'captured_network.json'), 'utf8'));

console.log(`Total captured responses: ${data.apiResponses.length}`);

data.apiResponses.forEach((res, i) => {
  console.log(`\n--------------------------------------------------`);
  console.log(`#${i + 1} URL: ${res.url}`);
  console.log(`Method: ${res.method} | Status: ${res.status}`);
  if (typeof res.body === 'object') {
    const keys = Object.keys(res.body);
    console.log(`Body Keys: ${keys.join(', ')}`);
    // Sample details
    if (res.body.eventLabel) {
      console.log(`eventLabel count: ${res.body.eventLabel.length}`);
    }
    if (res.body.onLiveEvents || res.body.events || res.body.eventList || Array.isArray(res.body)) {
      console.log(`Array/Events preview:`, JSON.stringify(res.body).substring(0, 300));
    }
  } else {
    console.log(`Body snippet: ${String(res.body).substring(0, 150)}`);
  }
});
