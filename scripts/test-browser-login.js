const puppeteer = require('puppeteer-core');

async function testLogin() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,960'],
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/growthIndia', { waitUntil: 'networkidle2' });

  // Call login from inside browser
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' })
    });
    return res.json();
  });
  console.log('Login result from inside browser:', result);

  // Reload to see if logged in
  await page.goto('http://localhost:3000/growthIndia', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Page text snippet:', text.slice(0, 300));
  
  await page.screenshot({ path: 'scratch/screenshots/test-gateway.png' });
  console.log('Saved scratch/screenshots/test-gateway.png');
  await browser.close();
}

testLogin().catch(console.error);
