const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '../scratch/screenshots');

async function snapModal() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 }
  });

  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });

  // Login
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' })
    });
    localStorage.setItem('gi_admin_selected_platform', 'GATEWAY');
  });

  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Open modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Admin Team'));
    if (btn) btn.click();
  });

  // Wait for table to load
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT_DIR, '03-admin-team-invite-modal.png') });
  console.log('Saved loaded 03-admin-team-invite-modal.png');

  await browser.close();
}

snapModal().catch(console.error);
