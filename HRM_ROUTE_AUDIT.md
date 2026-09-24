# HRM Route & Navigation Audit Report
**Platform**: Growth India Enterprise HRM & Payroll Subsystem  
**Audit Date**: September 24, 2026  
**Auditor**: Principal QA Engineer & Security Auditor  
**Scope**: Client Routes, Admin Shell Navigation Tabs, Server Redirects, and Responsive Layouts  

---

## 1. Architectural Architecture Note: Admin Console & Platform Switching

Growth India operates with **EXACTLY THREE ADMINISTRATIVE MODULES**:
1. **EMS** (Employee Management System)
2. **CRM** (Customer Relationship Management)
3. **HRM** (Human Resource Management & Payroll)

The administrative entrypoint is `/growthIndia` (controlled by `AdminConsoleShell.tsx`), with instant platform switching between EMS, CRM, and HRM. In addition, direct navigation to `/hrm` is permanently routed to the HRM shell.

---

## 2. Comprehensive Route & Navigation Matrix

| Route / Tab Path | Page / Screen Title | Auth Required | Permitted Roles | Layout Shell | Responsive Status | Audit Notes |
|---|---|---|---|---|---|---|
| `/hrm` | Growth India HRM Direct Entry | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | Direct Route Redirect | Responsive (Mobile & Desktop) | Sets local platform profile to `HRM` and loads shell instantly |
| `/growthIndia` (tab: `hrm-dashboard`) | HRM Executive Command Center | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`, `MANAGER_TL` | `HrmPlatformShell` | Fully Responsive (Breakpoints sm/md/lg/xl) | Displays live attendance rates, open headcount, pending leaves, audit logs |
| `/growthIndia` (tab: `hrm-payroll`) | Payroll & Statutory Processing Engine | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | `HrmPlatformShell` | Desktop Recommended (Horizontal Data Grids) | Multi-period selector, 5-step compute pipeline, payslip token generators |
| `/growthIndia` (tab: `hrm-organization`) | Corporate Structure & Policies | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | `HrmPlatformShell` | Fully Responsive | Department tree, organizational hierarchy, compliance policy engine |
| `/growthIndia` (tab: `hrm-employees`) | Workforce Directory & Profiles | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`, `MANAGER_TL` | `HrmPlatformShell` | Fully Responsive | Master EMS integration; reads directly from single source of truth |
| `/growthIndia` (tab: `hrm-attendance`) | Timesheets & Shift Regularization | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`, `MANAGER_TL` | `HrmPlatformShell` | Fully Responsive (Mobile Optimized Clock-in) | Biometric/Web clock-in, regularization workflow, daily logs |
| `/growthIndia` (tab: `hrm-leave`) | Leave Management & Quota Ledger | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`, `MANAGER_TL` | `HrmPlatformShell` | Fully Responsive | Balance indicators, calendar picker, multi-level manager approvals |
| `/growthIndia` (tab: `hrm-shifts`) | Shift Rotas & Rostering Engine | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | `HrmPlatformShell` | Fully Responsive | Day-wise shift definitions, grace periods, employee rota assignments |
| `/growthIndia` (tab: `hrm-recruitment`) | ATS Recruitment & Hiring Funnel | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | `HrmPlatformShell` | Desktop & Tablet Optimized (Kanban Board) | 14-step candidate pipeline, scorecards, offers, EMS conversion |
| `/growthIndia` (tab: `hrm-performance`) | 360 Performance Reviews & OKRs | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`, `MANAGER_TL` | `HrmPlatformShell` | Fully Responsive | Cycle configuration, OKR goal setting, self & manager evaluations |
| `/growthIndia` (tab: `hrm-self-service`) | Employee Self-Service (ESS) Portal | Yes | All Roles (`EMPLOYEE`, `MANAGER_TL`, `ADMIN`) | `HrmPlatformShell` / ESS View | Mobile First | Personal payslip history, leave application, reimbursement filing |
| `/growthIndia` (tab: `hrm-helpdesk`) | HR Service Desk & Ticketing | Yes | All Roles (`EMPLOYEE`, `MANAGER_TL`, `ADMIN`) | `HrmPlatformShell` | Fully Responsive | Threaded ticket conversation, category routing, resolution logs |
| `/growthIndia` (tab: `hrm-workflows`) | Automated HR Workflow Orchestrator | Yes | `ADMIN`, `SUPER_ADMIN` | `HrmPlatformShell` | Fully Responsive | Visual trigger builder, multi-step approvals, automated email notices |
| `/growthIndia` (tab: `hrm-reports`) | Statutory & Workforce Reports Center | Yes | `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR` | `HrmPlatformShell` | Desktop Optimized (Data Exports) | PF/ESI statutory sheets, headcount attrition charts, CSV/PDF exports |
| `/api/hrm/*` | HRM Serverless API Mesh | Yes (Bearer/Cookie) | Role-guarded per endpoint | Next.js Edge / Node Route Handlers | Headless API | 100% guarded with session validation and RBAC checks |

---

## 3. Responsive & Accessibility Testing Findings

1. **Mobile Viewport (375px - 640px)**:
   - Sidebar auto-collapses into an overlay hamburger drawer.
   - Self-Service mobile experience displays tap-friendly buttons (minimum 44x44px touch targets).
   - Clock-in and quick leave apply cards fit without horizontal clipping.
2. **Tablet Viewport (768px - 1024px)**:
   - Sidebar displays in condensed icon-only mode with active tooltips.
   - Kanban candidate board supports horizontal swipe scrolling with preserved column constraints.
3. **Desktop (1280px - 1920px)**:
   - Full expanded navigation with platform switcher, notification bell, and high-density financial data tables.
4. **Direct Route Protection**:
   - Accessing `/hrm` or `/growthIndia` unauthenticated immediately redirects to `/` or the secure administrator login modal with zero credential leakage.
