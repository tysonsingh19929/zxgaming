const fs = require('fs');
const data = JSON.parse(fs.readFileSync('sportsbook_event_captured.json', 'utf8'));

console.log('Top level keys:', Object.keys(data));
if (data.sportsBookMarket) {
  console.log('sportsBookMarket total count:', data.sportsBookMarket.length);
}

// Print keys of other top level properties
for (const key of Object.keys(data)) {
  if (Array.isArray(data[key])) {
    console.log(`Array Key [${key}] - length: ${data[key].length}`);
    if (data[key].length > 0) {
      console.log(`   First element sample of [${key}]:`, Object.keys(data[key][0]));
      console.log(`   Sample item:`, JSON.stringify(data[key][0], null, 2));
    }
  } else if (typeof data[key] === 'object' && data[key] !== null) {
    console.log(`Object Key [${key}] - keys:`, Object.keys(data[key]));
  }
}
