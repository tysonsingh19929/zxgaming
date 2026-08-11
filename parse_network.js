const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync(path.join(__dirname, 'captured_network.json'), 'utf8');
const data = JSON.parse(fileContent);

console.log(`Total captured responses: ${data.apiResponses.length}`);

data.apiResponses.forEach((res, i) => {
  if (res.url.includes('queryEventsWithMarket') || res.url.includes('queryMarket') || res.url.includes('queryEvent')) {
    console.log(`\n==================================================`);
    console.log(`[#${i + 1}] URL: ${res.url}`);
    console.log(`Method: ${res.method} | POST Data: ${res.postData}`);
    console.log(`Response Snippet:\n`, JSON.stringify(res.body, null, 2).substring(0, 1000));
  }
});
