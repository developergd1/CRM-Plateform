const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '../scratch/screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log('🚀 Launching Chrome for complete screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 }
  });

  const page = await browser.newPage();

  async function snap(name, delayMs = 1200) {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    const filePath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`📸 Saved: ${name}.png`);
  }

  try {
    // 1. Admin Login View (before login)
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await snap('01-admin-login');

    // Perform Login via in-page fetch
    console.log('Authenticating inside browser...');
    const loginResult = await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' })
      });
      return res.json();
    });
    console.log('Login result:', loginResult.success ? 'SUCCESS' : loginResult);

    // 2. Admin Gateway
    await page.evaluate(() => localStorage.setItem('gi_admin_selected_platform', 'GATEWAY'));
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await snap('02-admin-gateway', 1500);

    // 3. Admin Team Invite Modal
    console.log('Opening Admin Team Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Admin Team'));
      if (btn) btn.click();
    });
    await snap('03-admin-team-invite-modal', 1200);

    // Close Modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button:has(svg.lucide-x)');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // 4. CMS Dashboard
    console.log('Switching to CMS...');
    await page.evaluate(() => localStorage.setItem('gi_admin_selected_platform', 'CMS'));
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await snap('04-cms-dashboard', 1500);

    // 5. CMS Onboarding Tab
    console.log('Opening CMS Onboarding...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Client Onboarding'));
      if (btn) btn.click();
    });
    await snap('05-cms-onboarding', 1500);

    // 6. CMS Clients List
    console.log('Opening CMS Clients List...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Clients / Organizations'));
      if (btn) btn.click();
    });
    await snap('06-cms-clients-list', 2000);

    // 7. Click on first client in table
    console.log('Opening Selected Client Details...');
    await page.evaluate(() => {
      const row = document.querySelector('tbody tr') || document.querySelector('tr[class*="cursor-pointer"]');
      if (row) row.click();
    });
    await snap('07-cms-client-details', 2000);

    // 8. Open Client EMS Workforce
    console.log('Opening Client EMS Workforce tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Open Client EMS'));
      if (btn) btn.click();
    });
    await snap('08-cms-client-ems-workforce', 2000);

    // 9. HRM Platform Switch
    console.log('Switching to Enterprise HRM Platform...');
    await page.evaluate(() => localStorage.setItem('gi_admin_selected_platform', 'HRM'));
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await snap('09-hrm-dashboard', 2200);

    // 10. HRM 9-Stage Lifecycle Kanban
    console.log('Opening HRM Lifecycle Kanban...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Lifecycle'));
      if (link) link.click();
    });
    await snap('10-hrm-lifecycle-kanban', 1800);

    // 11. HRM Employee 360 Governance
    console.log('Opening Employee 360 view...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('360'));
      if (btn) btn.click();
    });
    await snap('11-hrm-employee-360', 1800);

    // 12. HRM Payroll
    console.log('Opening HRM Payroll...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Payroll'));
      if (link) link.click();
    });
    await snap('12-hrm-payroll', 2000);

    // 13. HRM Recruitment & ATS
    console.log('Opening HRM Recruitment...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Recruitment'));
      if (link) link.click();
    });
    await snap('13-hrm-recruitment', 2000);

    // 14. HRM Performance & OKRs
    console.log('Opening HRM Performance...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Performance'));
      if (link) link.click();
    });
    await snap('14-hrm-performance', 2000);

    // 15. HRM Leave Management
    console.log('Opening HRM Leave...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Leave'));
      if (link) link.click();
    });
    await snap('15-hrm-leave', 2000);

    // 16. HRM Helpdesk
    console.log('Opening HRM Helpdesk...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const link = links.find(el => el.textContent && el.textContent.includes('Helpdesk'));
      if (link) link.click();
    });
    await snap('16-hrm-helpdesk', 2000);

    // 17. Admin Accept Invite Page
    console.log('Navigating to Admin Accept Invite...');
    await page.goto(`${BASE_URL}/admin/accept-invite?token=demo_growth_india_preview_admin_token`, { waitUntil: 'networkidle2' });
    await snap('17-admin-accept-invite', 1500);

    // 18. Client Accept Invite Page
    console.log('Navigating to Client Accept Invite...');
    await page.goto(`${BASE_URL}/accept-invite?token=demo_growth_india_preview_client_token`, { waitUntil: 'networkidle2' });
    await snap('18-client-accept-invite', 1500);

    console.log('🎉 ALL SCREENSHOTS SUCCESSFULLY CAPTURED!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

captureAll();
