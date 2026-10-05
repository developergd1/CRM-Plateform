const fs = require('fs');
const path = require('path');

const imgPaths = {
  logo: 'e:/Growth India CRM Plateform/GROWTH_INDIA-png.png',
  adminLogin: 'e:/Growth India CRM Plateform/scratch/screenshots/01-admin-login.png',
  adminGateway: 'e:/Growth India CRM Plateform/scratch/screenshots/02-admin-gateway.png',
  adminTeamModal: 'e:/Growth India CRM Plateform/scratch/screenshots/03-admin-team-invite-modal.png',
  cmsDashboard: 'e:/Growth India CRM Plateform/scratch/screenshots/04-cms-dashboard.png',
  cmsOnboarding: 'e:/Growth India CRM Plateform/scratch/screenshots/05-cms-onboarding.png',
  cmsClientsList: 'e:/Growth India CRM Plateform/scratch/screenshots/06-cms-clients-list.png',
  cmsClientDetails: 'e:/Growth India CRM Plateform/scratch/screenshots/07-cms-client-details.png',
  cmsClientEms: 'e:/Growth India CRM Plateform/scratch/screenshots/08-cms-client-ems-workforce.png',
  hrmDashboard: 'e:/Growth India CRM Plateform/scratch/screenshots/09-hrm-dashboard.png',
  hrmLifecycleKanban: 'e:/Growth India CRM Plateform/scratch/screenshots/10-hrm-lifecycle-kanban.png',
  hrmEmployee360: 'e:/Growth India CRM Plateform/scratch/screenshots/11-hrm-employee-360.png',
  hrmPayroll: 'e:/Growth India CRM Plateform/scratch/screenshots/12-hrm-payroll.png',
  hrmRecruitment: 'e:/Growth India CRM Plateform/scratch/screenshots/13-hrm-recruitment.png',
  hrmPerformance: 'e:/Growth India CRM Plateform/scratch/screenshots/14-hrm-performance.png',
  hrmLeave: 'e:/Growth India CRM Plateform/scratch/screenshots/15-hrm-leave.png',
  hrmHelpdesk: 'e:/Growth India CRM Plateform/scratch/screenshots/16-hrm-helpdesk.png',
  adminAcceptInvite: 'e:/Growth India CRM Plateform/scratch/screenshots/17-admin-accept-invite.png',
  clientAcceptInvite: 'e:/Growth India CRM Plateform/scratch/screenshots/18-client-accept-invite.png',
  clientOverview: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/overview_tab_1790254235970.png',
  clientEmployees: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/my_employees_tab_1790254299199.png',
  clientAttendance: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/attendance_view_success_1790254659210.png',
  clientLeave: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/leave_management_tab_1790254723913.png',
  clientTasks: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/tasks_tab_1790254818534.png',
  clientDocs: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/documents_tab_1790254966080.png',
  clientSharedAccess: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/shared_access_tab_1790255474405.png',
  clientBlockHistory: 'C:/Users/aman2/.gemini/antigravity-ide/brain/2d54b611-553e-42ed-8ddf-40016743cb44/block_history_tab_1790255171218.png',
};

let allOk = true;
for (const [k, p] of Object.entries(imgPaths)) {
  const exists = fs.existsSync(p);
  const size = exists ? (fs.statSync(p).size / 1024).toFixed(1) + ' KB' : 'MISSING';
  console.log(`${k}: ${exists ? 'OK' : 'FAIL'} (${size})`);
  if (!exists) allOk = false;
}
console.log('All images ready:', allOk);
