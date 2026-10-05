const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '../scratch/screenshots');

async function snapInvites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 }
  });

  const page = await browser.newPage();

  // 1. Admin Accept Invite
  console.log('Capturing Admin Accept Invite form...');
  await page.goto(`${BASE_URL}/admin/accept-invite?token=demo_admin_preview_active_2026`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 }).catch(e => console.log('Timeout waiting for admin password input'));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, '17-admin-accept-invite.png') });
  console.log('Saved 17-admin-accept-invite.png');

  // 2. Client Accept Invite
  console.log('Capturing Client Accept Invite form...');
  await page.goto(`${BASE_URL}/accept-invite?token=demo_client_preview_active_2026`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 }).catch(e => console.log('Timeout waiting for client password input'));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, '18-client-accept-invite.png') });
  console.log('Saved 18-client-accept-invite.png');

  await browser.close();
}

snapInvites().catch(console.error);
