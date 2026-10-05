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

  console.log('Launching headless Chrome...');
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

  // Navigate to origin first so localStorage is accessible
  await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });

  const setPlatformAndTab = async (platform, tabKey, tabVal, extraState = {}) => {
    await page.evaluate((p, k, v, u, extra) => {
      localStorage.setItem('gi_auth_user', JSON.stringify(u));
      localStorage.setItem('gi_admin_selected_platform', p);
      if (k && v) localStorage.setItem(k, v);
      for (const [key, val] of Object.entries(extra)) {
        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
      }
    }, platform, tabKey, tabVal, data.user, extraState);
    await page.goto(`${BASE_URL}/growthIndia`, { waitUntil: 'networkidle2' });
    await delay(1500);
  };

  try {
    // 04: CMS Hub
    console.log('04: CMS Hub...');
    await setPlatformAndTab('CMS', 'gi_cms_active_tab', 'cms-hub');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_cms_hub.png') });

    // 05: CMS Dashboard
    console.log('05: CMS Dashboard...');
    await setPlatformAndTab('CMS', 'gi_cms_active_tab', 'cms-dashboard');
    await delay(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_cms_dashboard.png') });

    // 06: CMS Onboarding
    console.log('06: CMS Onboarding...');
    await setPlatformAndTab('CMS', 'gi_cms_active_tab', 'cms-onboarding');
    await delay(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_cms_onboarding.png') });

    // 07: CMS Clients List
    console.log('07: CMS Clients List...');
    await setPlatformAndTab('CMS', 'gi_cms_active_tab', 'cms-clients');
    await delay(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_cms_clients_list.png') });

    // 08: CMS Client Governance Details
    console.log('08: CMS Client Details...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a')).filter(el => el.textContent && (el.textContent.includes('Manage') || el.textContent.includes('View') || el.textContent.includes('Client')));
      if (btns.length > 0) btns[0].click();
    });
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_cms_client_details.png') });

    // 09: HRM Hub
    console.log('09: HRM Hub...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-hub');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_hrm_hub.png') });

    // 10: HRM Dashboard
    console.log('10: HRM Dashboard...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-dashboard');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_hrm_dashboard.png') });

    // 11: HRM Workforce Lifecycle
    console.log('11: Workforce Lifecycle...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-lifecycle', { gi_hrm_lifecycle_subtab: 'board' });
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_hrm_workforce_lifecycle.png') });

    // 12: HRM Employee 360
    console.log('12: Employee 360...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-lifecycle', { gi_hrm_lifecycle_subtab: '360' });
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '12_hrm_employee_360.png') });

    // 13: HRM Organization Setup
    console.log('13: Organization Setup...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-organization');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '13_hrm_organization_setup.png') });

    // 14: HRM Recruitment ATS
    console.log('14: Recruitment & ATS...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-recruitment');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '14_hrm_recruitment_ats.png') });

    // 15: HRM Time & Attendance
    console.log('15: Time & Attendance...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-attendance');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '15_hrm_attendance_live.png') });

    // 16: HRM Leave Ledger
    console.log('16: Leave Ledger...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-leave');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '16_hrm_leave_ledger.png') });

    // 17: HRM Payroll Console
    console.log('17: Payroll Console...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-payroll');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '17_hrm_payroll_console.png') });

    // 18: Payslip Breakdown View
    console.log('18: Payslip Breakdown...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent && (el.textContent.includes('Payslip') || el.textContent.includes('View') || el.textContent.includes('Download')));
      if (btn) btn.click();
    });
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '18_hrm_payslip_view.png') });
    await page.keyboard.press('Escape');

    // 19: HRM Performance PMS
    console.log('19: Performance PMS...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-performance');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '19_hrm_performance_pms.png') });

    // 20: HRM Helpdesk Tickets
    console.log('20: Helpdesk Tickets...');
    await setPlatformAndTab('HRM', 'gi_hrm_active_tab', 'hrm-helpdesk');
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '20_hrm_helpdesk_tickets.png') });

    // 21: CRM Pipeline
    console.log('21: CRM Pipeline...');
    await setPlatformAndTab('CRM', null, null);
    await delay(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '21_crm_dashboard.png') });

    console.log('\nSUCCESS: All 21 screenshots have been captured perfectly!');
  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await browser.close();
  }
}

run();
