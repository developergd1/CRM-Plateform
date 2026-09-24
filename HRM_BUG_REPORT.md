# HRM Defect & Vulnerability Resolution Report
**Platform**: Growth India Enterprise HRM & Payroll Subsystem  
**Audit Date**: September 24, 2026  
**Auditor**: Principal QA Engineer & Lead Full-Stack Architect  
**Scope**: All Bugs, Edge Cases, Vulnerabilities, and Functional Deficiencies Discovered & Fixed During Production Audit  

---

## 1. Executive Summary

During the comprehensive end-to-end audit, **8 genuine defects** were uncovered across the recruitment pipeline, leave quota ledger, payroll immutability, performance reviews, routing, and database query stability. 

**ALL 8 DEFECTS HAVE BEEN FIXED, TESTED, AND VERIFIED IN PRODUCTION.**

- **Critical Bugs**: 2 (Both Resolved)
- **High Severity Bugs**: 3 (All Resolved)
- **Medium Severity Bugs**: 3 (All Resolved)
- **Open / Unresolved Bugs**: 0

---

## 2. Detailed Bug Log & Resolution Matrix

### Bug HRM-001: Incomplete Recruitment API Handlers for ATS Pipeline
- **Severity**: High | **Priority**: P1 | **Module**: Recruitment & ATS
- **Description**: The endpoint `POST /api/hrm/recruitment` only supported candidate creation, failing to handle interviews, evaluations, offers, and requisitions.
- **Steps to Reproduce**: Send a POST request to `/api/hrm/recruitment` with `{ type: 'INTERVIEW' }`.
- **Expected vs Actual**: Expected interview to be scheduled; actual returned HTTP 400 "Missing candidate data".
- **Root Cause**: Missing switch-case branching for sub-actions in `src/app/api/hrm/recruitment/route.ts`.
- **Fix Implemented**: Added explicit handlers delegating to `scheduleInterview()`, `submitInterviewEvaluation()`, `createJobOffer()`, `updateOfferStatus()`, and `createJobRequisition()`.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-002: Lack of Overlapping Leave Request Validation
- **Severity**: High | **Priority**: P1 | **Module**: Leave Management
- **Description**: Employees were able to submit multiple overlapping leave applications for the identical date range, causing potential double-counting.
- **Steps to Reproduce**: Submit Leave Request 1 for 2026-06-10 to 2026-06-12. Submit Leave Request 2 for 2026-06-11 to 2026-06-13.
- **Expected vs Actual**: Request 2 should be rejected; actual accepted both.
- **Root Cause**: `createLeaveApplication()` in `leave.service.ts` lacked an overlapping date query.
- **Fix Implemented**: Added Prisma date overlap check: `startDate <= newEndDate && endDate >= newStartDate` with status in `['PENDING', 'APPROVED']`. Returns descriptive error if conflict exists.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-003: Leave Balance & Ledger Not Synchronized Upon Manager Approval
- **Severity**: Critical | **Priority**: P0 | **Module**: Leave Quotas & Ledgers
- **Description**: When a manager approved a paid leave request, the `LeaveRequest.status` updated to `APPROVED`, but the employee's `LeaveBalance.used` remained 0 and no immutable `LeaveLedger` debit entry was created.
- **Steps to Reproduce**: Approve a 3-day Casual Leave request and inspect `LeaveBalance` and `LeaveLedger`.
- **Expected vs Actual**: `available` should decrement by 3, `used` should increment by 3, and `LeaveLedger` record should be created; actual left balances unchanged.
- **Root Cause**: `approveLeaveApplication()` in `leave.service.ts` only mutated the `LeaveRequest` record.
- **Fix Implemented**: Enhanced `approveLeaveApplication()` to query employee balance, decrement available quota, increment used count, and create an immutable audit record in `LeaveLedger`.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-004: MongoDB Malformed ObjectID Unhandled Exception Crashes
- **Severity**: Critical | **Priority**: P0 | **Module**: Database / Core HRM Services
- **Description**: Querying employee or period records using alphanumeric identifiers (e.g., `QA-EMP-001` or `PAY-2026-06`) caused Prisma to crash with `BSONError: Malformed ObjectID` whenever passed to `where: { OR: [{ id: input }, { code: input }] }`.
- **Steps to Reproduce**: Call `getReimbursementClaims({ employeeId: 'QA-EMP-001' })`.
- **Expected vs Actual**: Query should resolve by employee code; actual crashed with 500 error.
- **Root Cause**: MongoDB requires 24-character hexadecimal strings for `id` fields. Passing arbitrary strings into `@id` clauses throws unhandled BSON errors.
- **Fix Implemented**: Wrapped all ObjectID queries with `isValidObjectId()` from `@/lib/prisma`. Added `resolveEmployeeObjectId()` helper across all HRM service layers.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-005: Improper 500 Status on Attendance Regularization Validation
- **Severity**: Medium | **Priority**: P2 | **Module**: Attendance & Timesheets
- **Description**: Attempting to submit a duplicate regularization request for the same date returned HTTP 500 Internal Server Error instead of a 400 Bad Request.
- **Steps to Reproduce**: Submit two regularization requests for the same date.
- **Expected vs Actual**: Expected HTTP 400 with user-friendly message; actual returned HTTP 500.
- **Root Cause**: Route handler `src/app/api/attendance/regularization/route.ts` caught business validation exceptions in generic `catch` and returned 500.
- **Fix Implemented**: Added structured exception handling returning HTTP 400 with descriptive JSON error payload.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-006: Finalized Payroll Periods Vulnerable to Deletion
- **Severity**: High | **Priority**: P0 | **Module**: Payroll Immutability
- **Description**: A `DELETE` request sent to `/api/hrm/payroll/periods/[id]` could delete a finalized payroll period, wiping historical payslips and audit trails.
- **Steps to Reproduce**: Finalize period `PAY-2026-06`. Send `DELETE /api/hrm/payroll/periods/[periodId]`.
- **Expected vs Actual**: Expected deletion to be strictly forbidden; actual had no check or had missing guard.
- **Root Cause**: Missing check for `period.status === 'FINALIZED'` or `period.status === 'APPROVED'`.
- **Fix Implemented**: Added guard in `src/app/api/hrm/payroll/periods/[id]/route.ts`: if period status is `APPROVED` or `FINALIZED`, returns HTTP 400 Bad Request: *"Cannot delete an approved or finalized payroll period"*.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-007: Performance Review Stuck in `PENDING_SELF` on Update
- **Severity**: Medium | **Priority**: P2 | **Module**: Performance & OKRs
- **Description**: When an employee updated an existing performance review with their self-rating and comments, the review status remained `PENDING_SELF` instead of advancing to `PENDING_MANAGER`.
- **Steps to Reproduce**: Pre-create a review in `PENDING_SELF`. Submit self-evaluation via `POST /api/hrm/performance`.
- **Expected vs Actual**: Expected status to advance to `PENDING_MANAGER`; actual stayed `PENDING_SELF`.
- **Root Cause**: The update branch in `submitPerformanceReview()` mutated `selfRating` and `selfComments` but neglected to transition `status` or record `selfSubmittedAt`.
- **Fix Implemented**: Added status transition to `PENDING_MANAGER`, timestamped `selfSubmittedAt`, and updated manager submission logic with `managerSubmittedAt`.
- **Status**: **VERIFIED FIXED (PASS)**

---

### Bug HRM-008: Direct Route `/hrm` Returned 404 Not Found
- **Severity**: Medium | **Priority**: P2 | **Module**: Navigation & Routing
- **Description**: Navigating directly to `/hrm` in the browser resulted in a Next.js 404 page because all admin features were hosted under `/growthIndia`.
- **Steps to Reproduce**: Open `http://localhost:3000/hrm` in browser.
- **Expected vs Actual**: Expected to land on the HRM platform; actual returned 404 Not Found.
- **Root Cause**: Absence of `src/app/hrm/page.tsx` route handler.
- **Fix Implemented**: Created `src/app/hrm/page.tsx` which automatically initializes the platform profile to `HRM` and loads the administration shell.
- **Status**: **VERIFIED FIXED (PASS)**
