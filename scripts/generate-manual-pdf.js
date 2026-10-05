const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MANUAL_MD_PATH = path.join(__dirname, '..', 'ADMIN_USER_MANUAL.md');
const OUTPUT_PDF_PATH = path.join(__dirname, '..', 'ADMIN_USER_MANUAL.pdf');
const PUBLIC_PDF_PATH = path.join(__dirname, '..', 'public', 'ADMIN_USER_MANUAL.pdf');

async function generatePdf() {
  console.log('Reading ADMIN_USER_MANUAL.md...');
  const markdownContent = fs.readFileSync(MANUAL_MD_PATH, 'utf-8');

  console.log('Converting Markdown to HTML...');
  let htmlBody = marked.parse(markdownContent);

  // Replace image sources with base64 data URIs for 100% self-contained offline rendering
  console.log('Embedding screenshots as base64...');
  htmlBody = htmlBody.replace(/<img\s+src="([^"]+)"\s+alt="([^"]*)"[^>]*>/g, (match, src, alt) => {
    try {
      const cleanSrc = src.replace(/^\/?/, '');
      const imgPath = path.resolve(__dirname, '..', cleanSrc);
      if (fs.existsSync(imgPath)) {
        const ext = path.extname(imgPath).toLowerCase().replace('.', '') || 'png';
        const base64Data = fs.readFileSync(imgPath).toString('base64');
        return `
          <div class="screenshot-figure">
            <div class="screenshot-wrapper">
              <img src="data:image/${ext};base64,${base64Data}" alt="${alt}" class="screenshot-img" />
            </div>
            ${alt ? `<div class="screenshot-caption">Figure: ${alt}</div>` : ''}
          </div>
        `;
      }
    } catch (e) {
      console.warn('Failed to embed image:', src, e.message);
    }
    return match;
  });

  // Replace GitHub callout alerts like > [!NOTE] or > [!TIP]
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!NOTE\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi, (match, text) => {
    return `<div class="callout callout-note"><span class="callout-icon">ℹ️</span><div class="callout-content"><strong>Note:</strong> ${text}</div></div>`;
  });
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!TIP\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi, (match, text) => {
    return `<div class="callout callout-tip"><span class="callout-icon">💡</span><div class="callout-content"><strong>Pro Tip:</strong> ${text}</div></div>`;
  });

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Growth India Enterprise Suite — Admin User Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.65;
      margin: 0;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      height: 100vh;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 20px;
      page-break-after: always;
      background: linear-gradient(145deg, #042F2E 0%, #0F172A 60%, #020617 100%);
      color: #FFFFFF;
      border-radius: 12px;
      margin-bottom: 30px;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding-bottom: 25px;
    }

    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #14B8A6;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-tag {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      background: rgba(20, 184, 166, 0.2);
      color: #5EEAD4;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(94, 234, 212, 0.3);
      font-weight: 700;
    }

    .cover-body {
      margin: auto 0;
    }

    .cover-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      background: #0D9488;
      color: #FFFFFF;
      padding: 6px 14px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    .cover-main-title {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.2;
      color: #FFFFFF;
      margin: 0 0 16px 0;
      letter-spacing: -1px;
    }

    .cover-subtitle {
      font-size: 18px;
      font-weight: 500;
      color: #94A3B8;
      line-height: 1.5;
      margin: 0 0 25px 0;
    }

    .cover-modules-pill {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 15px;
    }

    .module-pill {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #E2E8F0;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .cover-footer {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 12px;
      color: #94A3B8;
    }

    .meta-block strong {
      color: #FFFFFF;
      display: block;
      font-size: 13px;
      margin-bottom: 2px;
    }

    /* Content styling */
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0F172A;
      border-bottom: 2px solid #0D9488;
      padding-bottom: 8px;
      margin-top: 40px;
      margin-bottom: 18px;
      page-break-before: always;
    }

    h1:first-of-type {
      page-break-before: avoid;
    }

    h2 {
      font-size: 18px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 28px;
      margin-bottom: 12px;
      border-left: 4px solid #0D9488;
      padding-left: 10px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1E293B;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 0 0 12px 0;
    }

    ul, ol {
      margin: 0 0 14px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 5px;
    }

    strong {
      color: #0F172A;
      font-weight: 700;
    }

    code {
      font-family: 'SFMono-Regular', Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 11px;
      background: #F1F5F9;
      color: #0D9488;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #E2E8F0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px 0;
      font-size: 11.5px;
      page-break-inside: avoid;
    }

    th {
      background: #F8FAFC;
      color: #0F172A;
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      border: 1px solid #CBD5E1;
      border-top: 2px solid #0D9488;
    }

    td {
      padding: 8px 12px;
      border: 1px solid #E2E8F0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Screenshots */
    .screenshot-figure {
      margin: 20px 0 24px 0;
      page-break-inside: avoid;
      text-align: center;
    }

    .screenshot-wrapper {
      background: #F8FAFC;
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
      display: inline-block;
      max-width: 100%;
    }

    .screenshot-img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      border: 1px solid #E2E8F0;
    }

    .screenshot-caption {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
      margin-top: 6px;
    }

    /* Callout Boxes */
    .callout {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }

    .callout-note {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      color: #115E59;
    }

    .callout-tip {
      background: #FEFCE8;
      border: 1px solid #FEF08A;
      color: #854D0E;
    }

    .callout-icon {
      font-size: 16px;
      line-height: 1;
    }

    .callout-content {
      flex: 1;
    }

    /* Custom divider */
    hr {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 28px 0;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="brand-title">
        GROWTH INDIA
      </div>
      <div class="brand-tag">
        ENTERPRISE PLATFORM
      </div>
    </div>

    <div class="cover-body">
      <div class="cover-badge">Official Administrator Documentation</div>
      <h1 class="cover-main-title">Complete Enterprise<br>Admin User Manual</h1>
      <p class="cover-subtitle">
        End-to-End Operational and Governance Guide for CMS, HRM, Biometric Telemetry, Statutory Indian Payroll, and Commercial CRM.
      </p>

      <div class="cover-modules-pill">
        <div class="module-pill">🏢 Multi-Tenant CMS Hub</div>
        <div class="module-pill">👥 Enterprise HRM Suite</div>
        <div class="module-pill">⏰ Biometric Attendance & Telemetry</div>
        <div class="module-pill">💰 5-Step Statutory Indian Payroll</div>
        <div class="module-pill">📈 Commercial CRM Pipeline</div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="meta-block">
        <strong>Operating Version:</strong>
        Enterprise v2.4.0 Production Edition
      </div>
      <div class="meta-block" style="text-align: right;">
        <strong>Directorate:</strong>
        Growth India Architecture & Operations Team<br>
        October 2026 • Official Administrative Guide
      </div>
    </div>
  </div>

  <!-- Manual Body Content -->
  <div class="content-container">
    ${htmlBody}
  </div>

</body>
</html>
  `;

  const tempHtmlPath = path.join(__dirname, '..', 'temp_manual.html');
  fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');
  console.log('Temporary HTML created at:', tempHtmlPath);

  console.log('Launching Puppeteer Chrome to print PDF...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });

  console.log('Printing to PDF...');
  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '15mm',
      right: '15mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 8px; color: #94A3B8; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
        <span>Growth India Enterprise Platform — Admin User Manual</span>
        <span>Confidential & Internal Administrative Use</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 8px; color: #94A3B8; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-top: 1px solid #E2E8F0; padding-top: 4px;">
        <span>© 2026 Growth India Technologies</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  // Also copy to public directory for direct browser download
  fs.copyFileSync(OUTPUT_PDF_PATH, PUBLIC_PDF_PATH);

  await browser.close();

  // Clean up temp file
  try { fs.unlinkSync(tempHtmlPath); } catch {}

  console.log('SUCCESS! PDF generated:');
  console.log('1. Workspace Root:', OUTPUT_PDF_PATH);
  console.log('2. Public Download:', PUBLIC_PDF_PATH);
}

generatePdf().catch(err => {
  console.error('PDF Generation Failed:', err);
  process.exit(1);
});
