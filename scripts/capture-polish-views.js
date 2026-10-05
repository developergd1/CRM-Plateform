const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'manual-screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Authenticating via API...');
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' }),
  });
  const data = await res.json();
  const rawCookies = res.headers.get('set-cookie');
  const token = rawCookies?.match(/growth_session_token=([^;]+)/)?.[1];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  if (token) {
    await page.setCookie({
      name: 'growth_session_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    });
  }

  // 1. CRM Dashboard
  console.log('Recapturing 21_crm_dashboard.png...');
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await page.evaluate((u) => {
    localStorage.setItem('gi_auth_user', JSON.stringify(u));
    localStorage.setItem('gi_admin_selected_platform', 'CRM');
  }, data.user);
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await delay(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '21_crm_dashboard.png') });
  console.log('Saved 21_crm_dashboard.png');

  // 2. Employee 360 with full loaded profile
  console.log('Recapturing 12_hrm_employee_360.png...');
  await page.evaluate(() => {
    localStorage.setItem('gi_admin_selected_platform', 'HRM');
    localStorage.setItem('gi_hrm_active_tab', 'hrm-lifecycle');
    localStorage.setItem('gi_hrm_lifecycle_subtab', 'board');
  });
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await delay(2500);

  // Click on first employee's "360 Profile"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('360 Profile'));
    if (btns.length > 0) btns[0].click();
  });
  await delay(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_hrm_employee_360.png') });
  console.log('Saved 12_hrm_employee_360.png');

  // 3. Payslip modal preview
  console.log('Recapturing 18_hrm_payslip_view.png with modal...');
  await page.evaluate(() => {
    localStorage.setItem('gi_hrm_active_tab', 'hrm-payroll');
  });
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await delay(2500);

  // Click "Processed Records" tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Processed Records'));
    if (btns.length > 0) btns[0].click();
  });
  await delay(2000);

  // Click "View Slip"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('View Slip'));
    if (btns.length > 0) btns[0].click();
  });
  await delay(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '18_hrm_payslip_view.png') });
  console.log('Saved 18_hrm_payslip_view.png');

  // 4. CMS Client Governance Details
  console.log('Recapturing 08_cms_client_details.png...');
  await page.evaluate(() => {
    localStorage.setItem('gi_admin_selected_platform', 'CMS');
    localStorage.setItem('gi_cms_active_tab', 'cms-clients');
  });
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
  await delay(2500);

  // Click "Open EMS" on first client
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Open EMS'));
    if (btns.length > 0) btns[0].click();
  });
  await delay(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_cms_client_details.png') });
  console.log('Saved 08_cms_client_details.png');

  await browser.close();
  console.log('Polish capture completed successfully!');
}

run();
