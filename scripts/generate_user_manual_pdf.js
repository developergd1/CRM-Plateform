const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Growth India Platform - User Manual & Operating Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4;
      margin: 14mm 16mm 14mm 16mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.55;
      font-size: 13px;
    }

    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      padding: 60px 20px 40px 20px;
      border-bottom: 3px solid #0f766e;
    }

    .cover-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #042f2e;
      color: #14b8a6;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .cover-title-box {
      margin-top: 100px;
    }

    .cover-title {
      font-size: 42px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -1px;
    }

    .cover-title span {
      color: #0d9488;
    }

    .cover-subtitle {
      font-size: 18px;
      color: #64748b;
      margin-top: 16px;
      max-width: 600px;
      font-weight: 500;
    }

    .cover-meta {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 30px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 80px;
    }

    .meta-item h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .meta-item p {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 11px;
      color: #64748b;
    }

    /* Page Breaks & Flow */
    .page {
      page-break-after: always;
      padding-top: 10px;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    h1.section-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1.section-title span.number {
      background: #0d9488;
      color: white;
      font-size: 14px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
    }

    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 18px 0 8px 0;
    }

    h3 {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin: 12px 0 6px 0;
    }

    p {
      margin-bottom: 10px;
      color: #334155;
    }

    /* Highlight Cards */
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
    }

    .card-teal {
      background: #f0fdfa;
      border-color: #99f6e4;
    }

    .card-blue {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .card-amber {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-admin { background: #fee2e2; color: #b91c1c; }
    .badge-client { background: #dbeafe; color: #1d4ed8; }
    .badge-employee { background: #ccfbf1; color: #0f766e; }
    .badge-gold { background: #fef3c7; color: #b45309; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 11.5px;
    }

    th {
      background: #0f172a;
      color: #f8fafc;
      text-align: left;
      padding: 8px 10px;
      font-weight: 600;
      border: 1px solid #1e293b;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Code block */
    code, .code-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0f766e;
      border: 1px solid #e2e8f0;
    }

    /* Steps list */
    ol.steps-list {
      margin-left: 18px;
      margin-bottom: 12px;
    }

    ol.steps-list li {
      margin-bottom: 8px;
      color: #334155;
    }

    ul.bullets {
      margin-left: 18px;
      margin-bottom: 12px;
    }

    ul.bullets li {
      margin-bottom: 5px;
    }

    /* Flow diagram box */
    .flow-diagram {
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      margin: 12px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      line-height: 1.6;
      border-left: 4px solid #14b8a6;
    }

    .flow-diagram span.step { color: #5eead4; font-weight: 700; }
    .flow-diagram span.arrow { color: #f59e0b; }

    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      margin-top: 20px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 10px;
    }
  </style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="brand-badge">⚡ Growth India CRM Platform</div>
    </div>

    <div class="cover-title-box">
      <h1 class="cover-title">
        Enterprise Platform<br />
        <span>User Operating Manual</span>
      </h1>
      <p class="cover-subtitle">
        Comprehensive guide covering end-to-end task workflows, client operations, workforce management, and daily operational use cases.
      </p>

      <div class="cover-meta">
        <div class="meta-item">
          <h4>Target Audience</h4>
          <p>Admins, Clients & Staff</p>
        </div>
        <div class="meta-item">
          <h4>Version & Release</h4>
          <p>v2.0 (Production Ready)</p>
        </div>
        <div class="meta-item">
          <h4>Default Portal URL</h4>
          <p>http://localhost:3000</p>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div>Growth India Technology & Human Capital Solutions</div>
      <div>Confidential & Proprietary Operating Manual • September 2026</div>
    </div>
  </div>

  <!-- ==================== TABLE OF CONTENTS & ROLES ==================== -->
  <div class="page">
    <h1 class="section-title"><span class="number">01</span> Platform Architecture & User Roles</h1>
    
    <p>Growth India CRM & Employee Management Platform serves as the central operating command center for three primary stakeholder roles. Each role has a dedicated workspace with strict access controls.</p>

    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Access Portal</th>
          <th>Target Stakeholder</th>
          <th>Primary Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-admin">Administrator</span></td>
          <td><code>/growthIndia</code></td>
          <td>Executive Management, HR Head, Super Admin</td>
          <td>Client creation, employee master governance, KYC verification, global task oversight, system settings.</td>
        </tr>
        <tr>
          <td><span class="badge badge-client">Corporate Client</span></td>
          <td><code>/</code> (or <code>/client</code>)</td>
          <td>Partner Companies, Employers, Operations Managers</td>
          <td>Task creation, live comment tracking, employee roster monitoring, attendance review, work deliverable approvals.</td>
        </tr>
        <tr>
          <td><span class="badge badge-employee">Employee</span></td>
          <td><code>/</code> (or <code>/employee/attendance</code>)</td>
          <td>Assigned Staff, Executives, Developers, Field Workers</td>
          <td>Daily check-in/out, punch tracking, task deliverable submission, replying to client comments, leave requests.</td>
        </tr>
      </tbody>
    </table>

    <h2>🔐 Security & Clean Input Policy</h2>
    <div class="card card-teal">
      <div class="card-title">🛡️ Clean Privacy Standard (Zero Public Data Exposure)</div>
      <p>All login and modal input boxes across the platform are strictly protected against public data exposure:</p>
      <ul class="bullets">
        <li><strong>Email ID Placeholder:</strong> Login boxes display a generic <code>Email ID</code> placeholder instead of hardcoded emails.</li>
        <li><strong>Autofill Protection:</strong> Aggressive browser autofill injection is neutralized via dummy absorbers so clean inputs are always presented.</li>
        <li><strong>DPDP Masking:</strong> Sensitive employee identity documents (Aadhaar & PAN) are masked across all view drawers.</li>
      </ul>
    </div>

    <h2>🌐 Portal Access Points</h2>
    <div class="card card-blue">
      <ul class="bullets">
        <li><strong>Administrator Governance Center:</strong> Navigate to <code>http://localhost:3000/growthIndia</code></li>
        <li><strong>Client & Employee Workspace Portal:</strong> Navigate to <code>http://localhost:3000/</code></li>
        <li><strong>Default Administrator Credentials:</strong> <code>admin@growthindia.co</code> / Password: <code>Admin@123</code></li>
      </ul>
    </div>

    <div class="footer-note">Growth India CRM Operating Manual • Section 1: Architecture & Roles</div>
  </div>

  <!-- ==================== MODULE 2: CLIENT & EMPLOYEE ONBOARDING ==================== -->
  <div class="page">
    <h1 class="section-title"><span class="number">02</span> Client Onboarding & Workforce Allocation</h1>

    <p>How an Administrator onboards new corporate clients and provisions dedicated workforce accounts with automated sequential identifiers.</p>

    <div class="flow-diagram">
      <span class="step">Admin Portal (/growthIndia)</span> 
      <span class="arrow">➔</span> <span class="step">Click "Add Client"</span> 
      <span class="arrow">➔</span> <span class="step">Auto ID Generated (CLI-XXX-00001)</span> 
      <span class="arrow">➔</span> <span class="step">Credentials Issued</span> 
      <span class="arrow">➔</span> <span class="step">Client Hires Employees (EMP-XXX-0001)</span>
    </div>

    <h2>Use Case 2.1: Registering a New Client Organization</h2>
    <ol class="steps-list">
      <li>Log in to the Admin Portal at <code>http://localhost:3000/growthIndia</code> using your Administrator credentials.</li>
      <li>Click the gold <strong>"Add Client"</strong> button on the top executive toolbar.</li>
      <li>Fill in Organization Details:
        <ul class="bullets">
          <li><strong>Company Name:</strong> e.g., <em>Tata Motors Logistics</em></li>
          <li><strong>Contact Person Name & Mobile:</strong> Primary coordinator phone number.</li>
          <li><strong>Email ID:</strong> Corporate billing / official email.</li>
          <li><strong>Industry:</strong> Select industry domain (Manufacturing, IT, Logistics, Retail).</li>
        </ul>
      </li>
      <li>Click <strong>"Save & Create Client"</strong>. The system automatically issues a standardized Client ID (e.g., <code>CLI-TAT-00001</code>) and provides login credentials for the client.</li>
    </ol>

    <h2>Use Case 2.2: Adding Employees under a Client</h2>
    <ol class="steps-list">
      <li>In the Admin Portal or Client Portal, navigate to the <strong>"Employees"</strong> tab and click <strong>"Add Employee"</strong>.</li>
      <li>Select the target Client Company. The employee sequence will dynamically bind to that client (e.g. <code>EMP-TAT-0001</code>).</li>
      <li>Enter Full Name, Mobile Number, Designation, and Job Location.</li>
      <li>Upload KYC documents (Aadhaar & PAN) which are stored in the encrypted DPDP vault.</li>
      <li>Set temporary password or click <strong>"Generate Credentials"</strong>. The employee can now immediately log in via the Workspace Portal.</li>
    </ol>

    <div class="card card-amber">
      <div class="card-title">⚠️ Sequential ID Integrity Rule</div>
      <p>Client IDs always follow the <code>CLI-[3-Letter Prefix]-[5-Digit Sequence]</code> format (e.g., <code>CLI-SHR-00001</code>). Employee IDs follow <code>EMP-[3-Letter Prefix]-[4-Digit Sequence]</code>. Sequences never collide and maintain permanent corporate lineage.</p>
    </div>

    <div class="footer-note">Growth India CRM Operating Manual • Section 2: Client & Workforce Management</div>
  </div>

  <!-- ==================== MODULE 3: TASK MANAGEMENT & COLLABORATION ==================== -->
  <div class="page">
    <h1 class="section-title"><span class="number">03</span> Task Management, Deliverables & Live Chat</h1>

    <p>The core collaboration engine connecting Corporate Clients and Employees. Enables task delegation, live deliverable submissions, and real-time chat.</p>

    <div class="flow-diagram">
      <span class="step">Client Creates Task (TSK-XXXXXX)</span> 
      <span class="arrow">➔</span> <span class="step">Assigned to Staff (EMP-XXX-0001)</span> 
      <span class="arrow">➔</span> <span class="step">Staff Submits Deliverable Links</span> 
      <span class="arrow">➔</span> <span class="step">Live Comments & Chat Thread</span> 
      <span class="arrow">➔</span> <span class="step">Client Reviews & Completes</span>
    </div>

    <h2>Use Case 3.1: Client Creates & Assigns a Task</h2>
    <ol class="steps-list">
      <li>Log in to the Client Portal at <code>http://localhost:3000/</code> with client credentials.</li>
      <li>Navigate to the <strong>"Tasks & Deliverables"</strong> section and click <strong>"+ Create New Task"</strong>.</li>
      <li>Define Task Specifications:
        <ul class="bullets">
          <li><strong>Task Title:</strong> Specific deliverable objective (e.g., <em>Compile Regional Dispatch Logs for Sector 4</em>).</li>
          <li><strong>Assignee:</strong> Choose from company staff roster dropdown.</li>
          <li><strong>Priority & Due Date:</strong> Low, Medium, High, or Urgent.</li>
          <li><strong>Required Delivery Format:</strong> Excel/CSV, PDF, or Google Drive URL.</li>
          <li><strong>Checklist Items:</strong> Add step-by-step milestones for employee tracking.</li>
        </ul>
      </li>
      <li>Click <strong>"Assign Task"</strong>. The system generates a formatted Task ID (e.g., <code>TSK-000001</code>) and instantly updates the employee's task board.</li>
    </ol>

    <h2>Use Case 3.2: Employee View & Deliverable Submission</h2>
    <ol class="steps-list">
      <li>Employee logs in at <code>http://localhost:3000/</code> and views the <strong>"My Tasks"</strong> console.</li>
      <li>Click on the assigned task card. The 4-tab execution hub opens:
        <ul class="bullets">
          <li><strong>Tab 1: Work & Deliverables:</strong> Check off completed milestones, paste work URLs (Google Drive / GitHub / Sheet link), and click <em>"Submit for Client Review"</em>.</li>
          <li><strong>Tab 2: Comments & Chat:</strong> View all instructions from the Client and post real-time updates.</li>
          <li><strong>Tab 3: Review & Feedback:</strong> View ratings and remarks submitted by the Client upon review.</li>
          <li><strong>Tab 4: History:</strong> View full audit trail of task status shifts.</li>
        </ul>
      </li>
    </ol>

    <h2>Use Case 3.3: Real-Time Comments & Chat Synchronization</h2>
    <div class="card card-teal">
      <div class="card-title">💬 Live Two-Way Communication</div>
      <p>Both Clients and Employees can exchange messages directly inside the task modal. Comments automatically feature distinct role badges:</p>
      <ul class="bullets">
        <li><strong>Client Messages:</strong> Display <code>Client • [Company Name]</code> badge.</li>
        <li><strong>Employee Messages:</strong> Display <code>Staff</code> badge with employee name.</li>
        <li><strong>Local Section Refresh:</strong> Use the <strong>"Refresh Details"</strong> button to load new comments instantly without refreshing the webpage.</li>
      </ul>
    </div>

    <div class="footer-note">Growth India CRM Operating Manual • Section 3: Task Delegation & Collaboration</div>
  </div>

  <!-- ==================== MODULE 4: ATTENDANCE & HR OPERATIONS ==================== -->
  <div class="page">
    <h1 class="section-title"><span class="number">04</span> Daily Attendance, Breaks & Leave Management</h1>

    <p>Comprehensive workforce presence tracking with shift grace-period telemetry, break management, and employee leave requests.</p>

    <h2>Use Case 4.1: Daily Quick-Punch Cycle (Employee)</h2>
    <div class="card card-blue">
      <div class="card-title">⏱️ The 4-Step Daily Presence Flow</div>
      <ol class="steps-list">
        <li><strong>Check-In (Punch In):</strong> Click <em>"Punch In"</em> upon shift arrival. Checks in and timestamps work session. Late check-ins beyond 09:45 AM are flagged with exact delayed minutes.</li>
        <li><strong>Take Break:</strong> When stepping out for tea or lunch, click <em>"Take Break"</em> and select break category. Work session timer pauses.</li>
        <li><strong>Resume Work:</strong> Click <em>"Resume Work"</em> upon return. Productive time tracking automatically resumes.</li>
        <li><strong>Check-Out (Punch Out):</strong> Click <em>"Check Out"</em> at shift completion. System calculates total productive duration vs break minutes.</li>
      </ol>
    </div>

    <h2>Use Case 4.2: Client Attendance Hub & Roster Monitoring</h2>
    <p>Corporate Clients can inspect their deployed workforce attendance in real-time from the <strong>Attendance Hub</strong>:</p>
    <ul class="bullets">
      <li><strong>Turnout Metrics:</strong> Real-time counts of <em>Working Now</em>, <em>On Break</em>, <em>Punched Out</em>, and <em>Absent Today</em>.</li>
      <li><strong>Roster Table:</strong> Exact check-in times, break durations, and punctuality status for every employee.</li>
      <li><strong>Section Refresh Button:</strong> Dedicated <em>"Refresh Suite"</em> button in header refreshes live turnout without website reload.</li>
    </ul>

    <h2>Use Case 4.3: Employee Leave Application & HR Approval</h2>
    <ol class="steps-list">
      <li>Employee navigates to <strong>"Leave Management"</strong> and clicks <strong>"Apply Leave"</strong>.</li>
      <li>Select Leave Type (Casual Leave, Sick Leave, Emergency Leave).</li>
      <li>Specify Start Date, End Date, and business reason.</li>
      <li>Click <strong>"Submit Request"</strong>.</li>
      <li>Admin or HR Manager opens the <strong>"Leave Approvals"</strong> dashboard, inspects the request, and clicks <strong>"Approve"</strong> or <strong>"Reject"</strong> with reviewer remarks.</li>
    </ol>

    <div class="footer-note">Growth India CRM Operating Manual • Section 4: Attendance & HR Management</div>
  </div>

  <!-- ==================== MODULE 5: CRM PIPELINE & AUDIT LOGS ==================== -->
  <div class="page">
    <h1 class="section-title"><span class="number">05</span> Enterprise CRM Pipeline & Audit Governance</h1>

    <p>Managing sales leads, deal progression, multi-factor scoring, and immutable audit logging for compliance.</p>

    <h2>Use Case 5.1: Lead Ingestion with Real-Time Duplicate Prevention</h2>
    <p>When adding a sales prospect via <strong>"Add Lead"</strong>, the platform performs real-time duplicate checking against existing mobile numbers, emails, and company records:</p>
    <ul class="bullets">
      <li>If matching records exist, an instant warning displays with links to the existing lead.</li>
      <li>Prevents cross-executive territory conflicts and ensures clean data hygiene.</li>
    </ul>

    <h2>Use Case 5.2: 8-Stage Pipeline Progression</h2>
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th>Definition & Objective</th>
          <th>Next Action</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>NEW</code></td><td>Inbound lead or prospect ingested into system.</td><td>Assign sales executive & initiate first contact.</td></tr>
        <tr><td><code>CONTACTED</code></td><td>Introductory phone call or email completed.</td><td>Establish stakeholder requirements.</td></tr>
        <tr><td><code>QUALIFIED</code></td><td>Budget, authority, and timelines verified.</td><td>Schedule discovery meeting & product demo.</td></tr>
        <tr><td><code>FOLLOW_UP</code></td><td>Active discussion on scope and telemetry.</td><td>Prepare proposal / quote.</td></tr>
        <tr><td><code>PROPOSAL</code></td><td>Formal commercial quotation submitted.</td><td>Conduct pricing review & negotiation.</td></tr>
        <tr><td><code>NEGOTIATION</code></td><td>Contract terms and SLAs under legal review.</td><td>Finalize closing agreements.</td></tr>
        <tr><td><code>WON</code></td><td>Deal successfully closed & contract signed.</td><td>Automatically convert to active Client organization.</td></tr>
        <tr><td><code>LOST</code></td><td>Deal abandoned or lost to competitor.</td><td>Log loss reason for BI reporting.</td></tr>
      </tbody>
    </table>

    <h2>Use Case 5.3: Immutable Append-Only Audit Logging</h2>
    <div class="card card-amber">
      <div class="card-title">📜 Regulatory Compliance & Audit Center</div>
      <p>Every administrative action, stage transition, employee suspension, document preview, and task modification is permanently recorded in the <strong>Audit Logs Center</strong>:</p>
      <ul class="bullets">
        <li>Captures Actor ID, Entity ID, IP Address, Timestamp, and Before/After JSON data diff.</li>
        <li>Immutable and append-only: audit logs cannot be edited or deleted by any user.</li>
      </ul>
    </div>

    <h2>Summary: Quick Troubleshooting FAQ</h2>
    <div class="card card-teal">
      <p><strong>Q: Why does the login box not show pre-filled credentials?</strong><br />
      A: By design, for security and privacy compliance, all input boxes display clean placeholders. Enter your registered email ID and password manually.</p>
      <p><strong>Q: How do I refresh a specific section without reloading the whole site?</strong><br />
      A: Use the local <em>"Refresh"</em> buttons available at the top-right of each section (Overview, Workforce, Attendance, Tasks).</p>
    </div>

    <div class="footer-note">Growth India CRM Operating Manual • End of Document • Version 2.0</div>
  </div>

</body>
</html>`;

const outputPathHtml = path.resolve('docs', 'Growth_India_Platform_User_Manual.html');
const outputPathPdf = path.resolve('docs', 'Growth_India_Platform_User_Manual.pdf');
const artifactDir = path.resolve('C:\\Users\\aman2\\.gemini\\antigravity-ide\\brain\\8e7f4134-2f3b-4e70-a0ef-aee1de090d51');
const artifactPdf = path.resolve(artifactDir, 'Growth_India_Platform_User_Manual.pdf');

fs.writeFileSync(outputPathHtml, htmlContent, 'utf8');
console.log('✅ HTML User Manual generated at:', outputPathHtml);

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

execFile(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--print-to-pdf=' + outputPathPdf,
  outputPathHtml
], (err) => {
  if (err) {
    console.error('❌ Error generating PDF:', err);
    process.exit(1);
  }

  console.log('🎉 PDF successfully created at:', outputPathPdf);
  console.log('   File Size:', fs.statSync(outputPathPdf).size, 'bytes');

  // Also copy to brain artifact directory so it is directly accessible
  try {
    fs.copyFileSync(outputPathPdf, artifactPdf);
    console.log('📁 Artifact PDF mirrored at:', artifactPdf);
  } catch (e) {
    console.warn('Mirror warning:', e.message);
  }
});
