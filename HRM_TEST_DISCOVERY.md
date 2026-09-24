# Growth India HRM & Payroll Subsystem — Application Discovery Report

**Audit Date**: September 23, 2026  
**Auditor**: Principal QA Engineer & Security/Readiness Auditor  
**System Under Test**: Growth India Enterprise HRM (Human Resource Management) & Payroll Subsystem  
**Repository**: `Growth India CRM Platform`  

---

## 1. Existing Architecture

Growth India is an enterprise business suite built on Next.js 14 (App Router) with React 18, Tailwind CSS, TypeScript, and Prisma ORM connecting to a MongoDB Atlas multi-node replica set.

### Operating Platform Layout
The platform architecture defines **three administrative modules**:
1. **EMS (Employee Management System)**: The authoritative Employee Master system handling staff profiles, sequenced IDs (`GI-EMP-XXXXXX`), live attendance punches, biometric/session tracking, shift allocation, and disciplinary audit logs.
2. **CRM (Customer Relationship Management)**: Commercial operations platform with lead management, account tracking, deal pipelines, customer interactions, and client handoffs.
3. **HRM (Enterprise Human Resource Management & Payroll)**: Comprehensive human capital management covering multi-tenant organization setup, recruitment ATS, job requisitions/openings, candidate pipelines, performance cycles/OKRs, leave policies & balance ledgers, HR requests, employee grievances/helpdesk, workflow automation, and a first-class 5-step payroll calculation engine with statutory compliance (PF, PT, TDS, ESI).

**Employee Self-Service (ESS)** is an employee-facing experience accessed through `EmployeePortalShell` and `HrmSelfServiceView`, not a separate administrative module.

### Layered Breakdown
- **Presentation Layer**: Next.js App Router client components with Lucide React icons, Tailwind CSS, and Recharts.
- **Service Layer**: Dedicated business services in `src/services/hrm/`:
  - `payroll.service.ts`: 5-step payroll computation, rate card formulas, LOP calculation, reimbursement credit, loan EMI deduction, payslip generation, and Indian Rupee word conversion.
  - `leave.service.ts`: Leave policy lifecycle, automated quota accrual, transaction-safe balance deduction, approval workflows, and leave ledger logs.
  - `recruitment.service.ts`: Requisitions, job postings, candidate stage transitions, interview schedules, evaluations, job offers, and atomic candidate-to-EMS employee conversion.
  - `performance.service.ts`: Performance review cycles, OKRs, Goal/Key Result metric tracking, and self/manager reviews.
  - `experience.service.ts`: HR requests, ticket lifecycles, and policy acknowledgments.
- **Persistence Layer**:
  - **Prisma MongoDB**: 50+ models defined in `prisma/schema.prisma` with MongoDB `@db.ObjectId` mappings and composite indexes.
  - **In-Memory Store (`src/lib/hrmStore.ts`)**: Prototype in-memory store previously used for demo tenant switching and static mock views.
- **Authentication & Session Governance**:
  - Secure HTTP-only cookies (`gi_token`) containing signed JWT tokens (`jsonwebtoken`).
  - Active session registry in `ActiveUserSession` with IP address, user agent, and TTL expiry.
  - Password hashing using `bcryptjs` (salt rounds: 10).

---

## 2. Existing HRM Routes & Navigation

### Current Route Layout
- `/` -> Root router (`HomePage`). Renders `AppShell` for Employees/Clients/Managers or redirects Administrators to `/growthIndia`.
- `/growthIndia` -> Renders `AdminConsoleShell`. Provides the **Admin Platform Gateway** allowing administrators to choose:
  - `EMPLOYEE_MANAGEMENT` (Profile A)
  - `CRM` (Profile B)
  - `HRM` (Profile C — Enterprise HRM Platform)
- Inside `HrmPlatformShell`, navigation is controlled via active view state tabs:
  1. `hrm-dashboard` -> `HrmDashboardView`
  2. `hrm-payroll` -> `HrmPayrollView`
  3. `hrm-organization` -> `HrmOrganizationView`
  4. `hrm-employees` -> `HrmEmployeesView`
  5. `hrm-attendance` -> `HrmAttendanceView`
  6. `hrm-leave` -> `HrmLeaveView`
  7. `hrm-shifts` -> `HrmShiftsView`
  8. `hrm-recruitment` -> `HrmRecruitmentView`
  9. `hrm-performance` -> `HrmPerformanceView`
  10. `hrm-self-service` -> `HrmSelfServiceView`
  11. `hrm-helpdesk` -> `HrmHelpdeskView`
  12. `hrm-workflows` -> `HrmWorkflowEngineView`
  13. `hrm-reports` -> `HrmReportsView`
- `/employee` -> Employee workspace subroute (`EmployeeAttendanceView`).

### Deficiencies in Routing
- Top-level `/hrm` and `/hrm/*` (e.g. `/hrm/payroll/[id]`, `/hrm/leave/[id]`) do not have dedicated Next.js App Router page routes. Direct URL entry results in 404 instead of role-governed authorization checks.

---

## 3. Existing HRM APIs

The HRM subsystem provides 25+ REST API routes under `src/app/api/hrm`:

| Endpoint | HTTP Methods | Handlers / Purpose | Data Source |
|---|---|---|---|
| `/api/hrm/dashboard` | `GET` | Telemetry metrics (headcount, present, jobs, candidates, pending leaves, tickets, latest payroll, audit logs) | Prisma DB |
| `/api/hrm/leaves` | `GET`, `POST` | Retrieve leave types, balances, applications; submit new leave request | Prisma DB |
| `/api/hrm/leaves/[id]/approve` | `POST` | Approve or reject leave request, update ledger and balances | Prisma DB |
| `/api/hrm/recruitment` | `GET`, `POST` | List & create job requisitions, job openings, and candidate applications | Prisma DB |
| `/api/hrm/recruitment/candidates/[id]/convert` | `POST` | Convert candidate atomically to EMS Employee Master with sequential ID and salary assignment | Prisma DB |
| `/api/hrm/payroll/periods` | `GET`, `POST` | List payroll periods, generate new monthly payroll period code (`PAY-YYYY-MM`) | Prisma DB |
| `/api/hrm/payroll/periods/[id]` | `GET`, `DELETE` | Retrieve detailed payroll period with employee records, or delete draft period | Prisma DB |
| `/api/hrm/payroll/structures` | `GET`, `POST` | List salary components & structures; configure rate cards | Prisma DB |
| `/api/hrm/payroll/assignments` | `GET`, `POST` | List & assign employee salary structures with effective dating | Prisma DB |
| `/api/hrm/payroll/process` | `POST` | Execute 5-step payroll calculation engine for all eligible staff | Prisma DB |
| `/api/hrm/payroll/approve` | `POST` | Administrative sign-off and approval of processed payroll | Prisma DB |
| `/api/hrm/payroll/finalize` | `POST` | Finalize and lock payroll period, render records immutable, issue payslips | Prisma DB |
| `/api/hrm/payroll/payslips` | `GET` | Retrieve generated payslips by periodCode or employeeId | Prisma DB |
| `/api/hrm/payroll/payslips/[id]/download` | `GET` | Secure token-governed payslip download endpoint | Prisma DB |
| `/api/hrm/payroll/reimbursements` | `GET`, `POST` | Submit and retrieve employee expense claims | Prisma DB |
| `/api/hrm/payroll/reimbursements/[id]/approve`| `POST` | Manager/Finance approval of reimbursement claims | Prisma DB |
| `/api/hrm/payroll/loans` | `GET`, `POST` | Create and list employee loans / salary advances | Prisma DB |
| `/api/hrm/performance` | `GET`, `POST` | List performance cycles, goals, and key results | Prisma DB |
| `/api/hrm/performance/reviews` | `GET`, `POST` | Submit self and manager review evaluations | Prisma DB |
| `/api/hrm/requests` | `GET`, `POST` | Employee HR requests (letters, address/bank change) | Prisma DB |
| `/api/hrm/requests/[id]` | `PATCH` | HR resolution and status transition | Prisma DB |
| `/api/hrm/helpdesk` | `GET`, `POST` | Employee grievance and helpdesk tickets | Prisma DB |
| `/api/hrm/helpdesk/[id]/comments` | `POST` | Add ticket comment or attachment | Prisma DB |
| `/api/hrm/policies` | `GET`, `POST` | Company HR policies and employee acknowledgments | Prisma DB |
| `/api/hrm/organizations` | `GET`, `POST` | Organization management & multi-tenant configuration | `hrmStore` |
| `/api/hrm/employees` | `GET`, `POST` | Employee directory listing and onboarding | `hrmStore` (Mismatch with EMS Master) |
| `/api/hrm/attendance` | `GET`, `POST` | HRM attendance listing & check-in | `hrmStore` (Mismatch with EMS Master) |
| `/api/hrm/shifts` | `GET`, `POST` | Shift scheduling and work calendars | `hrmStore` |
| `/api/hrm/workflows` | `GET`, `POST` | Workflow configuration and approval routing | `hrmStore` |
| `/api/hrm/analytics` | `GET` | HRM analytics across tenants | `hrmStore` |

---

## 4. Existing Database Models

The Prisma schema defines complete enterprise relational models for HRM and Payroll:

### Core HR & Organization
- `User`: Base identity with `email`, `passwordHash`, `roleId`, `isActive`, `isSuspended`.
- `Role`: System roles (`SUPER_ADMIN`, `ADMIN_HR`, `ADMIN`, `MANAGER_TL`, `EMPLOYEE`, `CLIENT`).
- `Permission` & `RolePermission`: Many-to-many permission grants.
- `Department` & `Team`: Organizational hierarchy.
- `Employee`: EMS Employee Master with sequential `employeeId` (`GI-EMP-XXXXXX`), personal details, PAN, Aadhaar, salary assignments, manager hierarchy, and status (`ACTIVE`, `INACTIVE`, `BLOCKED`).

### Leave Engine
- `LeaveType`: Leave categories (`CASUAL`, `SICK`, `EARNED`, `UNPAID`).
- `LeavePolicy`: Quota configuration, accrual rates, half-day allowance, carry-forward caps.
- `LeaveBalance`: Per-employee annual balance ledger (`openingBalance`, `accrued`, `used`, `adjusted`, `pending`, `available`).
- `LeaveLedger`: Immutable ledger entries recording transactions (`OPENING`, `ACCRUAL`, `USAGE`, `ADJUSTMENT`).

### Recruitment ATS
- `JobRequisition`: Internal staffing requisition with budget, headcount, and approval status.
- `JobOpening`: Public/internal job posting with requirements and experience ranges.
- `Candidate`: Applicant profile with stage (`APPLIED` -> `SCREENING` -> `SHORTLISTED` -> `INTERVIEW` -> `EVALUATION` -> `OFFER` -> `HIRED` -> `REJECTED`).
- `Interview` & `InterviewEvaluation`: Scheduled rounds, meeting links, ratings (1-5), and hire recommendations.
- `JobOffer`: Issued compensation package, joining date, and status.

### Performance & OKRs
- `PerformanceCycle`: Time-bounded review cycles (`PERF-YYYY-QX`).
- `Goal` & `KeyResult`: Objective & Key Result tracking with weights, progress (0-100%), and metric targets.
- `PerformanceReview`: Self-rating, manager evaluation, and final calibrated score.

### Employee Experience
- `HrRequestType` & `HrRequest`: Dynamic service request forms.
- `HelpdeskTicket` & `HelpdeskComment`: Support tickets with priority, categories, and resolution tracking.
- `HrPolicy` & `HrPolicyAcknowledgment`: Policy versioning and employee compliance records.

### Payroll & Compensation Subsystem
- `PayrollPeriod`: Monthly cycle (`PAY-YYYY-MM`), status progression (`DRAFT` -> `PROCESSING` -> `APPROVED` -> `FINALIZED` -> `LOCKED`), total financial summaries.
- `SalaryComponent`: Earning/deduction components (`BASIC`, `HRA`, `CONVEYANCE`, `SPECIAL_ALLOWANCE`, `PF_EMP`, `PT`, `TDS`).
- `SalaryStructure` & `SalaryStructureComponent`: Reusable compensation grade templates.
- `EmployeeSalaryAssignment`: Versioned employee CTC packages with `effectiveFrom` and `isCurrent` tracking.
- `PayrollRecord`: Per-employee computed payroll statement with attendance inputs (`payableDays`, `presentDays`, `paidLeaveDays`, `unpaidDays`/LOP).
- `PayrollEarningItem` & `PayrollDeductionItem`: Itemized breakdown for every record.
- `PayrollAdjustmentItem`: Bonuses, penalties, and arrears.
- `Payslip`: Immutable employee payslip with Indian Rupee words, masked bank/PAN, and download tokens.
- `ReimbursementClaim`: Expense claims linked to payroll disbursement.
- `EmployeeLoan` & `LoanRepaymentSchedule`: Advance tracking with automatic EMI deductions.
- `PayrollApprovalLog`: Administrative audit trace for sign-offs and finalizations.

---

## 5. Existing Permissions & RBAC

Implemented in `src/lib/rbac.ts`:
- **HRM Permission Codes**: `hrm:view`, `hrm:policies:view`, `hrm:policies:manage`, `hrm:leaves:view`, `hrm:leaves:apply`, `hrm:leaves:approve`, `hrm:leaves:manage_ledger`, `hrm:recruitment:view`, `hrm:recruitment:manage`, `hrm:candidate:convert`, `hrm:performance:view`, `hrm:performance:manage`, `hrm:performance:review`, `hrm:helpdesk:view`, `hrm:helpdesk:manage`, `hrm:requests:view`, `hrm:requests:manage`.
- **Payroll Permission Codes**: `payroll:view`, `payroll:periods:manage`, `payroll:process`, `payroll:approve`, `payroll:finalize`, `payroll:structures:manage`, `payroll:assignments:manage`, `payroll:reimbursements:manage`, `payroll:loans:manage`, `payroll:payslip:view_any`.
- **Helper Guards**:
  - `isAdmin(role)`: `ADMIN`, `SUPER_ADMIN`, `ADMIN_HR`.
  - `canApproveLeave(role)`: Admin or `MANAGER_TL`.
  - `canProcessPayroll(role)`: Admin only.
  - `canApprovePayroll(role)`: `ADMIN` or `SUPER_ADMIN`.
  - `canFinalizePayroll(role)`: `ADMIN` or `SUPER_ADMIN`.
  - `canViewEmployeePayslip(currentUserRole, currentEmpId, targetEmpId)`: Admin or matching own employee ID.
  - `getHrmResourceScope(role)`: `GLOBAL` for Admin, `TEAM` for Manager, `OWN` for Employee.

---

## 6. Existing Workflows

1. **Recruitment to EMS Onboarding Flow**:
   Job Requisition -> Job Opening -> Candidate Application -> Interview Scheduling -> Evaluation -> Job Offer -> Offer Acceptance (`HIRED`) -> `convertCandidateToEmployee` -> Generates sequential `GI-EMP-XXXXXX`, User account, and Salary Assignment.
2. **Leave Application & Approval Flow**:
   Employee applies leave -> Checked against `LeaveBalance` -> Status `PENDING` -> Manager/HR reviews -> `APPROVED` -> Balance decrements (`used` increases, `available` drops) -> `LeaveLedger` records transaction -> LOP days automatically fed into monthly payroll.
3. **5-Step Payroll Calculation Flow**:
   - Step 1: Initialize period & identify eligible active employees.
   - Step 2: Fetch current active `SalaryAssignment` and compute standard monthly rate card.
   - Step 3: Integrate attendance & unpaid leave (LOP) days from Leave Ledger to calculate attendance pro-rata factor and LOP deduction.
   - Step 4: Aggregate approved reimbursements (credit) and active loan repayment EMIs (deduction).
   - Step 5: Compute Gross Pay, Total Deductions (PF + PT + TDS + LOP + Loan), and Net Pay. Generate itemized records.
4. **Payroll Governance Flow**:
   Processed (`PROCESSED`) -> Executive Review & Sign-Off (`APPROVED`) -> Finalization (`FINALIZED`) -> Immutability lock applied -> Number-to-words payslips generated.

---

## 7. Existing Integrations

1. **EMS <-> HRM**:
   - EMS serves as the Employee Master (`Employee` table in Prisma).
   - Candidate conversions directly insert into EMS.
   - Attendance and LOP leaves directly determine payable days in payroll.
2. **CRM <-> HRM**:
   - Shared employee user IDs for account/deal owners.
   - Audit logging centralized through `logAuditEvent`.

---

## 8. Existing Test Coverage

- Root script `test-hrm-payroll.js` covers 12 sequential API tests:
  - Admin login
  - Dashboard telemetry
  - Leave types retrieval
  - Leave application & approval
  - Job opening & candidate creation
  - Atomic candidate conversion to EMS Master
  - Salary structures & rate cards
  - Payroll period creation & 5-step processing
  - Payroll approval
  - Payroll finalization & payslip generation
  - Payslip retrieval
  - Reimbursement claim creation

---

## 9. Missing Infrastructure & Gaps Identified

1. **Direct Route Access**:
   No `/hrm` top-level route in `src/app`. All HRM features are currently wrapped inside `/growthIndia` tab switching. Direct URLs (e.g. `/hrm/payroll/[id]`, `/hrm/leave`) cannot be reached directly via address bar.
2. **Store Fragmentation**:
   `src/app/api/hrm/employees` and `src/app/api/hrm/attendance` read/write to `hrmStore` in-memory mock rather than syncing with the authoritative Prisma `Employee` and `Attendance` tables.
3. **ESS Navigation in Employee Portal**:
   `EmployeePortalShell` has tabs for Work Attendance, Tasks, Leave, and Regularization, but lacks UI navigation for personal Payslips, Reimbursements, and Helpdesk tickets.
4. **Tenant Isolation Enforcement**:
   Multi-tenancy in `src/app/api/hrm/organizations` is stored in memory (`hrmStore.tenants`) without strict MongoDB tenant partition keys on all child models.

---

## 10. Risk Areas for Production Readiness

1. **P0 / High Security Risk**: If an employee can guess another employee's payslip ID or download token, does the API strictly enforce `canViewEmployeePayslip`?
2. **P0 / Financial Integrity Risk**: Does payroll finalization truly prevent subsequent recalculation, deletion, or modification of salary lines?
3. **P1 / Data Consistency Risk**: Discrepancies between UI values, API JSON responses, and MongoDB database stored amounts.
4. **P1 / Calculation Precision**: Ensuring that gross minus total deductions equals net pay exactly to two decimal places without floating-point drift.
5. **P2 / Interactive UI Completeness**: Ensuring every button in HRM views has active handlers, loading indicators, and error feedback rather than inert mock listeners.

---

**Next Action**: Build the comprehensive test inventory `HRM_TEST_MATRIX.md` and execute the 20-phase verification plan.
