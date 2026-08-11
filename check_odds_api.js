const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'captured_network.json'), 'utf8'));

console.log('Searching for endpoints with odds or runner details...');
data.apiResponses.forEach((res) => {
  const jsonStr = JSON.stringify(res.body);
  if (jsonStr.includes('backOdds') || jsonStr.includes('availableToBack') || jsonStr.includes('runners') || jsonStr.includes('price')) {
    console.log(`\nFound matching endpoint: ${res.url}`);
    console.log(`Method: ${res.method} | Post Data: ${res.postData}`);
    console.log(`Snippet:`, jsonStr.substring(0, 400));
  }
});
