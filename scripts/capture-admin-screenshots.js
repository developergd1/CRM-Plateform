const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'manual-screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Authenticate via API to get cookie & user data
  console.log('Authenticating admin via API...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status: ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  console.log('Logged in successfully as:', loginData.user.fullName, loginData.user.role);

  // Extract growth_session_token from set-cookie
  const rawCookies = loginRes.headers.get('set-cookie');
  let sessionToken = '';
  if (rawCookies) {
    const match = rawCookies.match(/growth_session_token=([^;]+)/);
    if (match) sessionToken = match[1];
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  try {
    // 01: Login Page
    console.log('Capturing 01_login_page.png...');
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_page.png') });

    // Set auth cookie
    if (sessionToken) {
      await page.setCookie({
        name: 'growth_session_token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      });
    }

    // Set localStorage cache
    await page.evaluate((userData) => {
      localStorage.setItem('gi_auth_user', JSON.stringify(userData));
      localStorage.setItem('gi_admin_selected_platform', 'GATEWAY');
    }, loginData.user);

    // 02: Admin Platform Gateway
    console.log('Navigating to Admin Gateway...');
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_admin_gateway.png') });
    console.log('Saved 02_admin_gateway.png');

    // 03: Admin Team Modal
    try {
      console.log('Capturing Admin Team Modal...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.includes('Admin Team'));
        if (b) b.click();
      });
      await delay(1500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '03_admin_team_modal.png') });
      console.log('Saved 03_admin_team_modal.png');
      // Close modal
      await page.keyboard.press('Escape');
      await delay(800);
    } catch (e) {
      console.log('Admin Team modal skip:', e.message);
    }

    // 04: CMS Hub
    console.log('Capturing CMS Hub...');
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('h2, div'));
      const cms = els.find(el => el.textContent && el.textContent.trim() === 'CMS');
      if (cms) cms.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_cms_hub.png') });
    console.log('Saved 04_cms_hub.png');

    // 05: CMS Dashboard
    console.log('Capturing CMS Dashboard...');
    await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3, h2, div, span'));
      const d = titles.find(t => t.textContent && t.textContent.includes('CMS Dashboard'));
      if (d) d.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_cms_dashboard.png') });
    console.log('Saved 05_cms_dashboard.png');

    // Back to CMS Hub
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Back to CMS'));
      if (backBtn) backBtn.click();
    });
    await delay(1000);

    // 06: CMS Client Onboarding
    console.log('Capturing CMS Client Onboarding...');
    await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3, h2, div, span'));
      const d = titles.find(t => t.textContent && t.textContent.includes('Client Onboarding'));
      if (d) d.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_cms_onboarding.png') });
    console.log('Saved 06_cms_onboarding.png');

    // Back to CMS Hub
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Back to CMS'));
      if (backBtn) backBtn.click();
    });
    await delay(1000);

    // 07: CMS Clients / Organizations List
    console.log('Capturing CMS Clients List...');
    await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3, h2, div, span'));
      const d = titles.find(t => t.textContent && t.textContent.includes('Clients / Organizations'));
      if (d) d.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_cms_clients_list.png') });
    console.log('Saved 07_cms_clients_list.png');

    // 08: CMS Client Governance Details
    try {
      console.log('Capturing CMS Client Governance Details...');
      await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('button, div, tr')).filter(el => el.textContent && (el.textContent.includes('Manage') || el.textContent.includes('View') || el.textContent.includes('Alpha') || el.textContent.includes('Corp')));
        if (rows.length > 0) rows[0].click();
      });
      await delay(2000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '08_cms_client_details.png') });
      console.log('Saved 08_cms_client_details.png');
    } catch (e) {
      console.log('Client details skip:', e.message);
    }

    // 09: Switch to HRM Hub
    console.log('Switching to HRM Hub...');
    await page.evaluate(() => {
      localStorage.setItem('gi_admin_selected_platform', 'HRM');
    });
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_hrm_hub.png') });
    console.log('Saved 09_hrm_hub.png');

    // 10: HRM Dashboard
    console.log('Capturing HRM Dashboard...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h2, h3, div')).filter(c => c.textContent && c.textContent.includes('HRM Dashboard'));
      if (cards.length > 0) cards[0].click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_hrm_dashboard.png') });
    console.log('Saved 10_hrm_dashboard.png');

    // Back to HRM Hub
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Back to HRM'));
      if (b) b.click();
    });
    await delay(1200);

    // 11: Workforce & Organization (Lifecycle)
    console.log('Capturing Workforce Lifecycle Kanban...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h2, h3, div')).filter(c => c.textContent && c.textContent.includes('Workforce & Organization'));
      if (cards.length > 0) cards[0].click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_hrm_workforce_lifecycle.png') });
    console.log('Saved 11_hrm_workforce_lifecycle.png');

    // 12: Employee 360 View
    try {
      console.log('Capturing Employee 360 View...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('360 Profile'));
        if (b) b.click();
      });
      await delay(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '12_hrm_employee_360.png') });
      console.log('Saved 12_hrm_employee_360.png');
    } catch (e) {
      console.log('Employee 360 skip:', e.message);
    }

    // 13: Organization Setup
    try {
      console.log('Capturing Organization Setup...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Organization Setup'));
        if (b) b.click();
      });
      await delay(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '13_hrm_organization_setup.png') });
      console.log('Saved 13_hrm_organization_setup.png');
    } catch (e) {
      console.log('Organization Setup skip:', e.message);
    }

    // 14: Recruitment & ATS
    try {
      console.log('Capturing Recruitment & ATS...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Recruitment & ATS'));
        if (b) b.click();
      });
      await delay(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '14_hrm_recruitment_ats.png') });
      console.log('Saved 14_hrm_recruitment_ats.png');
    } catch (e) {
      console.log('Recruitment ATS skip:', e.message);
    }

    // Back to HRM Hub
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Back to HRM'));
      if (b) b.click();
    });
    await delay(1200);

    // 15: Time & Attendance
    console.log('Capturing Time & Attendance...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h2, h3, div')).filter(c => c.textContent && c.textContent.includes('Time & Attendance'));
      if (cards.length > 0) cards[0].click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '15_hrm_attendance_live.png') });
    console.log('Saved 15_hrm_attendance_live.png');

    // 16: Leave Ledger & Approvals
    try {
      console.log('Capturing Leave Ledger...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Leave Ledger'));
        if (b) b.click();
      });
      await delay(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '16_hrm_leave_ledger.png') });
      console.log('Saved 16_hrm_leave_ledger.png');
    } catch (e) {
      console.log('Leave ledger skip:', e.message);
    }

    // Back to HRM Hub
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Back to HRM'));
      if (b) b.click();
    });
    await delay(1200);

    // 17: Payroll & Compensation
    console.log('Capturing Payroll Console...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h2, h3, div')).filter(c => c.textContent && c.textContent.includes('Payroll & Compensation'));
      if (cards.length > 0) cards[0].click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '17_hrm_payroll_console.png') });
    console.log('Saved 17_hrm_payroll_console.png');

    // 18: Payslip Breakdown View
    try {
      console.log('Capturing Payslip Breakdown View...');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent && (el.textContent.includes('Payslip') || el.textContent.includes('View') || el.textContent.includes('Download')));
        if (btn) btn.click();
      });
      await delay(2000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '18_hrm_payslip_view.png') });
      console.log('Saved 18_hrm_payslip_view.png');
      await page.keyboard.press('Escape');
      await delay(600);
    } catch (e) {
      console.log('Payslip preview skip:', e.message);
    }

    // Back to HRM Hub
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Back to HRM'));
      if (b) b.click();
    });
    await delay(1200);

    // 19: Performance PMS
    console.log('Capturing Performance PMS...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h2, h3, div')).filter(c => c.textContent && c.textContent.includes('Performance & Helpdesk'));
      if (cards.length > 0) cards[0].click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '19_hrm_performance_pms.png') });
    console.log('Saved 19_hrm_performance_pms.png');

    // 20: Helpdesk Tickets
    try {
      console.log('Capturing Helpdesk...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Helpdesk'));
        if (b) b.click();
      });
      await delay(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '20_hrm_helpdesk_tickets.png') });
      console.log('Saved 20_hrm_helpdesk_tickets.png');
    } catch (e) {
      console.log('Helpdesk skip:', e.message);
    }

    // 21: CRM Pipeline
    console.log('Capturing CRM Pipeline...');
    await page.goto(`${BASE_URL}/growthIndia/crm`, { waitUntil: 'networkidle2' });
    await delay(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '21_crm_dashboard.png') });
    console.log('Saved 21_crm_dashboard.png');

    console.log('\nSUCCESS: All screenshots have been captured and saved to public/manual-screenshots/');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
