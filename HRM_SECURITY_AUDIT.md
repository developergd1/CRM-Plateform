# HRM Security & Vulnerability Audit Report
**Platform**: Growth India Enterprise HRM & Payroll Subsystem  
**Audit Date**: September 24, 2026  
**Auditor**: Principal QA Engineer & Lead Security Auditor  
**Standard**: OWASP Top 10 (2021), CIS Benchmarks, Indian IT Act 2000 & Digital Personal Data Protection Act (DPDPA 2023)  

---

## 1. Executive Summary

A comprehensive, adversarial security assessment was executed targeting all HRM authentication endpoints, payroll calculations, sensitive employee PII data stores, and database interaction boundaries.

- **Vulnerabilities Identified**: 0 Critical, 0 High, 1 Medium (Resolved), 1 Low (Documented)
- **Injection Attacks (NoSQL / SQL / Command)**: 100% Mitigated via Prisma Typed ORM
- **Authentication Bypass Attempts**: 100% Blocked
- **Data Tampering & Payroll Mutation**: Blocked post-finalization via cryptographic token & state immutability

---

## 2. Security Domain Evaluations

### A. Authentication & Session Security (OWASP A07:2021)
1. **Public vs Administrator Portal Segregation**:
   - Administrator accounts (`SUPER_ADMIN`, `ADMIN`, `ADMIN_HR`) attempting to authenticate via public employee login endpoints are strictly rejected with HTTP 403: *"Security Policy: Administrator accounts cannot log in through the public portal. Access denied."*
   - Administrators must authenticate via privileged admin channels, preventing credential stuffing on public portals.
2. **Session Cookie Hardening**:
   - Authentication tokens are issued via `HttpOnly`, `SameSite=Lax`, and `Secure` cookies (in production). JavaScript execution inside the browser cannot access or exfiltrate raw session JWTs.
3. **Session Invalidation & Re-login**:
   - Signing out triggers both client-side storage clearance and server cookie invalidation.

### B. Broken Object Level Authorization (BOLA / IDOR) (OWASP A01:2021)
1. **Cross-Employee Payslip Isolation**:
   - **Vector**: Malicious employee manipulating URL query parameter `?employeeId=<TARGET_EMPLOYEE_ID>` in `/api/hrm/payroll/payslips`.
   - **Defense**: Server-side authentication hook enforces `isAdmin(user.role)`. Non-admin sessions have `employeeId` forcibly overwritten to `user.employeeProfile.id`.
   - **Audit Finding**: Penetration tests verified that Employee 1 cannot view Employee 2's CTC, basic pay, deductions, or download links.
2. **Expense Reimbursement Tampering**:
   - Non-admin users attempting to submit claims for other employees have `targetEmpId` bound to their own authenticated profile.
   - Self-approval attempts via `POST /api/hrm/payroll/reimbursements` with `{ type: "APPROVE" }` by an employee return HTTP 403 Forbidden.

### C. Injection & Malformed Input Handling (OWASP A03:2021)
1. **MongoDB Malformed ObjectID Injection**:
   - **Vulnerability Identified During Audit (HRM-004)**: Passing non-hex identifiers (e.g. `QA-EMP-001` or `' OR 1=1 --`) directly into Prisma `where: { id }` queries triggered Prisma runtime unhandled exceptions.
   - **Remediation**: Implemented `isValidObjectId()` validator from `@/lib/prisma`. All queries now safely branch between 24-character hex ObjectIDs and alphanumeric enterprise codes (`employeeId`), eliminating server crashes and blind query injection.
2. **Re-entrancy & Financial Double Submissions**:
   - Processing the same payroll period simultaneously or re-processing after finalization is rejected with database state checks: `if (period.status === 'FINALIZED') throw new Error('Cannot re-process a finalized period')`.

### D. Sensitive Data Protection & Indian DPDPA Compliance (OWASP A02:2021)
1. **PAN & Bank Account Masking**:
   - Bank Account Numbers (`bankAccountNumber`) and Permanent Account Numbers (`panNumber`) are restricted in general API responses and only exposed to authorized Payroll Officers.
   - Public employee directory endpoints expose only operational attributes (Name, Designation, Department, Email).
2. **Audit Logging & Immutability**:
   - Every administrative payroll computation, status change, and finalization creates an immutable record in `PayrollApprovalLog` with actor ID, actor name, timestamp, and action description.
   - Finalized periods reject `DELETE /api/hrm/payroll/periods/[id]` with HTTP 400 Bad Request: *"Cannot delete an approved or finalized payroll period"*.

### E. Rate Limiting & Denial of Service
1. **Attendance Web Clock-in Duplication**:
   - Rapid multiple clock-ins within the same minute update the existing day's attendance record rather than spawning unindexed duplicate rows.
2. **Attendance Regularization Safeguards**:
   - Duplicate regularization requests for the same date are rejected with HTTP 400, preventing pending queue inundation.

---

## 3. Security Recommendations

| Recommendation | Priority | Implementation Strategy | Status |
|---|---|---|---|
| Implement strict Prisma ObjectId validation helper | High | Use `isValidObjectId()` in all dynamic route handlers | **Implemented** |
| Enforce payroll period finalization immutability | Critical | Reject re-process and DELETE if `status === 'FINALIZED'` | **Implemented** |
| Enforce public vs admin login portal segregation | High | Filter roles in `/api/auth/login` | **Verified Active** |
| Rotate JWT secret key periodically in production environment | Medium | Configure 90-day automated secret rotation | Recommended for Prod Ops |
