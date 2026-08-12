const { chromium } = require('playwright');

async function inspectLoginDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.skyexch.vip/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const elements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, type: i.type, id: i.id, name: i.name, value: i.value }));
    const imgs = Array.from(document.querySelectorAll('img, canvas, svg')).map(i => ({ tag: i.tagName, src: i.src, id: i.id, class: i.className }));
    return { inputs, imgs };
  });

  console.log('Inputs:', JSON.stringify(elements.inputs, null, 2));
  console.log('Images/Canvas:', JSON.stringify(elements.imgs, null, 2));

  await browser.close();
}

inspectLoginDom().catch(console.error);
