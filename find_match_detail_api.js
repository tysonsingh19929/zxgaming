const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'captured_network.json'), 'utf8'));

const urls = new Set();
data.apiResponses.forEach(r => urls.add(r.url));

console.log('Captured unique API URLs:');
urls.forEach(u => console.log(' - ' + u));
