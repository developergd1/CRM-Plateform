// In-memory + file/tenant persistent HRM Store for Enterprise Multi-Tenant Platform

export interface HrmTenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  logo?: string;
  plan: string;
  employeeCount: number;
  contactEmail: string;
  timezone: string;
  currency: string;
  workDays: string[];
  holidays: { name: string; date: string }[];
  locations: string[];
  departments: { id: string; name: string; code: string; manager: string; employees: number }[];
  designations: { id: string; title: string; department: string; level: string }[];
}

export interface HrmEmployee {
  id: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  joiningDate: string;
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'PART_TIME' | 'INTERN';
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'TERMINATED';
  reportingManager: string;
  shift: string;
  skills: string[];
  assets: { name: string; tag: string; serial: string; status: string }[];
  documents: { title: string; type: string; url: string; verified: boolean }[];
  history: { role: string; from: string; to: string }[];
  customFields?: Record<string, any>;
}

export interface HrmAttendance {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalHours: number;
  breakMinutes: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';
  overtimeMinutes: number;
  regularized?: boolean;
}

export interface HrmLeaveType {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  annualQuota: number;
  carryForward: boolean;
  requiresProof: boolean;
  color: string;
}

export interface HrmLeaveApplication {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
  approvalHistory: { step: string; actor: string; action: string; comment?: string; timestamp: string }[];
}

export interface HrmShift {
  id: string;
  tenantId: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  assignedEmployees: number;
  days: string[];
}

export interface HrmJobOpening {
  id: string;
  tenantId: string;
  title: string;
  department: string;
  location: string;
  type: string;
  openings: number;
  applicantsCount: number;
  status: 'OPEN' | 'IN_REVIEW' | 'CLOSED';
  postedDate: string;
  experienceRequired: string;
}

export interface HrmCandidate {
  id: string;
  tenantId: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  stage: 'APPLIED' | 'SCREENING' | 'TECHNICAL_INTERVIEW' | 'MANAGEMENT_ROUND' | 'OFFER_MADE' | 'HIRED' | 'REJECTED';
  appliedDate: string;
  experienceYears: number;
  currentCompany?: string;
  rating: number;
  interviewNotes?: string;
}

export interface HrmGoal {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  category: 'BUSINESS' | 'TECHNICAL' | 'LEADERSHIP' | 'LEARNING';
  targetDate: string;
  progress: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK';
  weightage: number;
  rating?: number;
  managerFeedback?: string;
}

export interface HrmTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  employeeId: string;
  employeeName: string;
  category: 'PAYROLL' | 'WORKPLACE' | 'LEAVE_ATTENDANCE' | 'IT_ASSETS' | 'GRIEVANCE';
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo: string;
  createdAt: string;
  comments: { author: string; role: string; text: string; timestamp: string }[];
}

export interface HrmWorkflow {
  id: string;
  tenantId: string;
  title: string;
  triggerEvent: 'LEAVE_APPLIED' | 'ATTENDANCE_LATE' | 'CANDIDATE_HIRED' | 'ASSET_ALLOCATED' | 'TICKET_CREATED';
  condition: { field: string; operator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN'; value: any };
  steps: { stepName: string; approverRole: string; timeoutHours: number }[];
  action: { type: 'UPDATE_RECORD' | 'GENERATE_DOCUMENT' | 'ASSIGN_TASK'; details: string };
  notifications: { targetRole: string; channel: 'EMAIL' | 'IN_APP' | 'SMS'; message: string }[];
  isActive: boolean;
}

// Global in-memory storage holding multi-tenant state
class HrmDataStore {
  tenants: HrmTenant[] = [
    {
      id: 'ten-growth-india',
      name: 'Growth India Technologies',
      slug: 'growth-india',
      industry: 'Enterprise IT & Software Solutions',
      plan: 'ENTERPRISE_PRO',
      employeeCount: 68,
      contactEmail: 'hr@growthindia.in',
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      locations: ['Noida (HQ)', 'Bengaluru Hub', 'Mumbai Office', 'Remote'],
      holidays: [
        { name: 'Republic Day', date: '2026-01-26' },
        { name: 'Holi Festival', date: '2026-03-04' },
        { name: 'Independence Day', date: '2026-08-15' },
        { name: 'Gandhi Jayanti', date: '2026-10-02' },
        { name: 'Diwali', date: '2026-11-08' },
      ],
      departments: [
        { id: 'dept-eng', name: 'Engineering & DevOps', code: 'ENG', manager: 'Aarav Sharma', employees: 28 },
        { id: 'dept-sales', name: 'Enterprise Sales', code: 'SALES', manager: 'Rahul Verma', employees: 18 },
        { id: 'dept-hr', name: 'Human Resources & Talent', code: 'HR', manager: 'Neha Gupta', employees: 8 },
        { id: 'dept-ops', name: 'Client Success & Ops', code: 'OPS', manager: 'Priya Patel', employees: 14 },
      ],
      designations: [
        { id: 'des-1', title: 'VP of Technology', department: 'Engineering & DevOps', level: 'Executive' },
        { id: 'des-2', title: 'Senior Full Stack Engineer', department: 'Engineering & DevOps', level: 'Senior' },
        { id: 'des-3', title: 'Sales Manager', department: 'Enterprise Sales', level: 'Lead' },
        { id: 'des-4', title: 'Enterprise Account Executive', department: 'Enterprise Sales', level: 'Mid' },
        { id: 'des-5', title: 'HR Lead & Governance Officer', department: 'Human Resources & Talent', level: 'Lead' },
      ],
    },
    {
      id: 'ten-zenith-logistics',
      name: 'Zenith Logistics & Supply Chain',
      slug: 'zenith-logistics',
      industry: 'Supply Chain & Cold Storage',
      plan: 'BUSINESS_PLUS',
      employeeCount: 142,
      contactEmail: 'operations@zenithlogistics.in',
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      locations: ['Gurugram Mega Warehouse', 'Bhiwandi Terminal', 'Chennai Port Hub'],
      holidays: [
        { name: 'New Year', date: '2026-01-01' },
        { name: 'Independence Day', date: '2026-08-15' },
        { name: 'Diwali', date: '2026-11-08' },
      ],
      departments: [
        { id: 'dept-fleet', name: 'Fleet & Dispatch', code: 'FLEET', manager: 'Karan Mehra', employees: 64 },
        { id: 'dept-warehouse', name: 'Inventory & Warehousing', code: 'WH', manager: 'Sunita Rao', employees: 55 },
        { id: 'dept-compliance', name: 'Safety & Regulatory', code: 'COMP', manager: 'Vikas Joshi', employees: 23 },
      ],
      designations: [
        { id: 'des-z1', title: 'Logistics Operations Director', department: 'Fleet & Dispatch', level: 'Executive' },
        { id: 'des-z2', title: 'Fleet Supervisor', department: 'Fleet & Dispatch', level: 'Lead' },
        { id: 'des-z3', title: 'Warehouse Inventory Officer', department: 'Inventory & Warehousing', level: 'Mid' },
      ],
    },
    {
      id: 'ten-aura-health',
      name: 'Aura Diagnostics & Healthcare',
      slug: 'aura-health',
      industry: 'Healthcare & Clinical Diagnostics',
      plan: 'ENTERPRISE_PRO',
      employeeCount: 94,
      contactEmail: 'admin@aurahealth.com',
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      locations: ['Central Laboratory Delhi', 'Apollo Partner Wing', 'CyberCity Clinic'],
      holidays: [
        { name: 'Republic Day', date: '2026-01-26' },
        { name: 'Independence Day', date: '2026-08-15' },
        { name: 'Diwali', date: '2026-11-08' },
      ],
      departments: [
        { id: 'dept-clinical', name: 'Clinical Pathology', code: 'CLIN', manager: 'Dr. Ananya Roy', employees: 42 },
        { id: 'dept-admin', name: 'Hospital Administration', code: 'ADMIN', manager: 'Rajeev Singhania', employees: 30 },
        { id: 'dept-nursing', name: 'Patient Care & Nursing', code: 'NURS', manager: 'Sister Mary', employees: 22 },
      ],
      designations: [
        { id: 'des-a1', title: 'Chief Pathologist', department: 'Clinical Pathology', level: 'Executive' },
        { id: 'des-a2', title: 'Lab Technician Specialist', department: 'Clinical Pathology', level: 'Mid' },
        { id: 'des-a3', title: 'Patient Relations Officer', department: 'Hospital Administration', level: 'Junior' },
      ],
    },
  ];

  employees: HrmEmployee[] = [
    {
      id: 'hrm-emp-101',
      tenantId: 'ten-growth-india',
      employeeCode: 'GI-HRM-1001',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@growthindia.in',
      phone: '+91 98112 34567',
      department: 'Engineering & DevOps',
      designation: 'VP of Technology',
      location: 'Noida (HQ)',
      joiningDate: '2023-04-15',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Board of Directors',
      shift: 'General Day (09:30 - 18:30)',
      skills: ['System Architecture', 'Next.js', 'MongoDB', 'Cloud Security'],
      assets: [
        { name: 'MacBook Pro M3 Max 16"', tag: 'AST-GI-0941', serial: 'C02G65J8MD6', status: 'ALLOCATED' },
        { name: 'YubiKey 5C NFC Security Key', tag: 'AST-GI-SEC-12', serial: 'YK982133', status: 'ALLOCATED' },
      ],
      documents: [
        { title: 'Executive Employment Contract', type: 'AGREEMENT', url: '#', verified: true },
        { title: 'KYC Aadhaar & PAN Card', type: 'GOVT_ID', url: '#', verified: true },
      ],
      history: [
        { role: 'Lead Architect', from: '2023-04', to: '2024-12' },
        { role: 'VP of Technology', from: '2025-01', to: 'Present' },
      ],
    },
    {
      id: 'hrm-emp-102',
      tenantId: 'ten-growth-india',
      employeeCode: 'GI-HRM-1002',
      name: 'Neha Gupta',
      email: 'neha.gupta@growthindia.in',
      phone: '+91 98710 43210',
      department: 'Human Resources & Talent',
      designation: 'HR Lead & Governance Officer',
      location: 'Noida (HQ)',
      joiningDate: '2023-08-01',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Aarav Sharma',
      shift: 'General Day (09:30 - 18:30)',
      skills: ['Talent Acquisition', 'Statutory Compliance', 'Conflict Resolution', 'Compensation'],
      assets: [
        { name: 'Dell XPS 15 9530', tag: 'AST-GI-0812', serial: '8JK29M1', status: 'ALLOCATED' },
      ],
      documents: [
        { title: 'HR Governance Certification', type: 'CERTIFICATE', url: '#', verified: true },
      ],
      history: [
        { role: 'Senior HR Specialist', from: '2023-08', to: '2024-06' },
        { role: 'HR Lead', from: '2024-07', to: 'Present' },
      ],
    },
    {
      id: 'hrm-emp-103',
      tenantId: 'ten-growth-india',
      employeeCode: 'GI-HRM-1003',
      name: 'Rahul Verma',
      email: 'rahul.verma@growthindia.in',
      phone: '+91 98991 76543',
      department: 'Enterprise Sales',
      designation: 'Sales Manager',
      location: 'Bengaluru Hub',
      joiningDate: '2024-01-10',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Aarav Sharma',
      shift: 'Sales Flexible (10:00 - 19:00)',
      skills: ['B2B Sales', 'Key Account Strategy', 'Pipeline Conversion', 'Team Coaching'],
      assets: [
        { name: 'ThinkPad X1 Carbon Gen 11', tag: 'AST-GI-1102', serial: 'PF418K02', status: 'ALLOCATED' },
      ],
      documents: [
        { title: 'Joining Agreement', type: 'AGREEMENT', url: '#', verified: true },
      ],
      history: [
        { role: 'Sales Lead', from: '2024-01', to: '2025-03' },
        { role: 'Sales Manager', from: '2025-04', to: 'Present' },
      ],
    },
    {
      id: 'hrm-emp-104',
      tenantId: 'ten-growth-india',
      employeeCode: 'GI-HRM-1004',
      name: 'Priya Patel',
      email: 'priya.patel@growthindia.in',
      phone: '+91 97234 11987',
      department: 'Client Success & Ops',
      designation: 'Enterprise Account Executive',
      location: 'Mumbai Office',
      joiningDate: '2024-05-20',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Rahul Verma',
      shift: 'General Day (09:30 - 18:30)',
      skills: ['Client Onboarding', 'Customer Success', 'Escalation Resolution'],
      assets: [
        { name: 'MacBook Air M2 15"', tag: 'AST-GI-1390', serial: 'C02H20K8MD5', status: 'ALLOCATED' },
      ],
      documents: [
        { title: 'Offer Letter', type: 'AGREEMENT', url: '#', verified: true },
      ],
      history: [
        { role: 'Account Executive', from: '2024-05', to: 'Present' },
      ],
    },
    // Zenith Logistics Sample Employee
    {
      id: 'hrm-emp-201',
      tenantId: 'ten-zenith-logistics',
      employeeCode: 'ZEN-FLEET-001',
      name: 'Karan Mehra',
      email: 'karan.m@zenithlogistics.in',
      phone: '+91 98200 44321',
      department: 'Fleet & Dispatch',
      designation: 'Logistics Operations Director',
      location: 'Gurugram Mega Warehouse',
      joiningDate: '2022-11-01',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Managing Director',
      shift: 'Warehouse Morning (06:00 - 15:00)',
      skills: ['Fleet Telematics', 'Cold Chain Compliance', 'Route Optimization'],
      assets: [
        { name: 'Rugged Panasonic Toughbook', tag: 'AST-ZN-01', serial: 'TB-98214', status: 'ALLOCATED' },
      ],
      documents: [
        { title: 'Commercial Driving & Fleet Certification', type: 'CERTIFICATE', url: '#', verified: true },
      ],
      history: [
        { role: 'Operations Director', from: '2022-11', to: 'Present' },
      ],
    },
  ];

  attendance: HrmAttendance[] = [
    {
      id: 'att-1',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-101',
      employeeName: 'Aarav Sharma',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:14 AM',
      checkOut: '06:45 PM',
      totalHours: 9.5,
      breakMinutes: 45,
      status: 'PRESENT',
      overtimeMinutes: 45,
    },
    {
      id: 'att-2',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-102',
      employeeName: 'Neha Gupta',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:22 AM',
      checkOut: '06:30 PM',
      totalHours: 9.1,
      breakMinutes: 50,
      status: 'PRESENT',
      overtimeMinutes: 0,
    },
    {
      id: 'att-3',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-103',
      employeeName: 'Rahul Verma',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:52 AM',
      checkOut: '',
      totalHours: 7.2,
      breakMinutes: 30,
      status: 'LATE',
      overtimeMinutes: 0,
    },
    {
      id: 'att-4',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-104',
      employeeName: 'Priya Patel',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:28 AM',
      checkOut: '06:35 PM',
      totalHours: 9.1,
      breakMinutes: 40,
      status: 'PRESENT',
      overtimeMinutes: 10,
    },
  ];

  leaveTypes: HrmLeaveType[] = [
    {
      id: 'lt-cl',
      tenantId: 'ten-growth-india',
      name: 'Casual Leave (CL)',
      code: 'CL',
      annualQuota: 12,
      carryForward: false,
      requiresProof: false,
      color: 'bg-teal-500 text-white',
    },
    {
      id: 'lt-sl',
      tenantId: 'ten-growth-india',
      name: 'Sick Leave (SL)',
      code: 'SL',
      annualQuota: 10,
      carryForward: false,
      requiresProof: true,
      color: 'bg-rose-500 text-white',
    },
    {
      id: 'lt-el',
      tenantId: 'ten-growth-india',
      name: 'Earned / Privilege Leave (EL)',
      code: 'EL',
      annualQuota: 18,
      carryForward: true,
      requiresProof: false,
      color: 'bg-indigo-500 text-white',
    },
    {
      id: 'lt-mat',
      tenantId: 'ten-growth-india',
      name: 'Maternity Leave',
      code: 'ML',
      annualQuota: 180,
      carryForward: false,
      requiresProof: true,
      color: 'bg-purple-500 text-white',
    },
    {
      id: 'lt-pat',
      tenantId: 'ten-growth-india',
      name: 'Paternity Leave',
      code: 'PL',
      annualQuota: 15,
      carryForward: false,
      requiresProof: true,
      color: 'bg-amber-500 text-white',
    },
  ];

  leaveApplications: HrmLeaveApplication[] = [
    {
      id: 'leave-app-01',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-104',
      employeeName: 'Priya Patel',
      department: 'Client Success & Ops',
      leaveTypeId: 'lt-el',
      leaveTypeName: 'Earned / Privilege Leave (EL)',
      startDate: '2026-09-28',
      endDate: '2026-10-02',
      days: 5,
      reason: 'Family wedding ceremony and travel to hometown.',
      status: 'PENDING_MANAGER',
      appliedAt: '2026-09-22 10:30 AM',
      approvalHistory: [
        { step: 'Submission', actor: 'Priya Patel', action: 'APPLIED', timestamp: '2026-09-22 10:30 AM' },
      ],
    },
    {
      id: 'leave-app-02',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-103',
      employeeName: 'Rahul Verma',
      department: 'Enterprise Sales',
      leaveTypeId: 'lt-cl',
      leaveTypeName: 'Casual Leave (CL)',
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      days: 1,
      reason: 'Personal administrative errands at government office.',
      status: 'APPROVED',
      appliedAt: '2026-09-20 04:12 PM',
      approvalHistory: [
        { step: 'Submission', actor: 'Rahul Verma', action: 'APPLIED', timestamp: '2026-09-20 04:12 PM' },
        { step: 'Manager Approval', actor: 'Aarav Sharma', action: 'APPROVED', comment: 'Approved. Enjoy the day off.', timestamp: '2026-09-21 09:15 AM' },
        { step: 'HR Ledger Update', actor: 'Neha Gupta', action: 'CONFIRMED', comment: 'Balance updated: 8 CL remaining.', timestamp: '2026-09-21 11:00 AM' },
      ],
    },
  ];

  shifts: HrmShift[] = [
    {
      id: 'sh-general',
      tenantId: 'ten-growth-india',
      name: 'General Business Day',
      startTime: '09:30 AM',
      endTime: '06:30 PM',
      gracePeriodMinutes: 15,
      assignedEmployees: 48,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    {
      id: 'sh-morning',
      tenantId: 'ten-growth-india',
      name: 'Early Morning Support Shift',
      startTime: '07:00 AM',
      endTime: '04:00 PM',
      gracePeriodMinutes: 10,
      assignedEmployees: 12,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    {
      id: 'sh-evening',
      tenantId: 'ten-growth-india',
      name: 'US Overlap Evening Shift',
      startTime: '03:30 PM',
      endTime: '12:30 AM',
      gracePeriodMinutes: 15,
      assignedEmployees: 8,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
  ];

  jobs: HrmJobOpening[] = [
    {
      id: 'job-01',
      tenantId: 'ten-growth-india',
      title: 'Senior Full Stack Engineer (Next.js / Node.js)',
      department: 'Engineering & DevOps',
      location: 'Noida (HQ) / Hybrid',
      type: 'Full-Time',
      openings: 3,
      applicantsCount: 38,
      status: 'OPEN',
      postedDate: '2026-09-10',
      experienceRequired: '4 - 7 Years',
    },
    {
      id: 'job-02',
      tenantId: 'ten-growth-india',
      title: 'Enterprise Account Manager - BFSI',
      department: 'Enterprise Sales',
      location: 'Bengaluru Hub',
      type: 'Full-Time',
      openings: 2,
      applicantsCount: 22,
      status: 'OPEN',
      postedDate: '2026-09-14',
      experienceRequired: '5 - 8 Years',
    },
    {
      id: 'job-03',
      tenantId: 'ten-growth-india',
      title: 'DevOps & Cloud Infrastructure Lead',
      department: 'Engineering & DevOps',
      location: 'Remote',
      type: 'Full-Time',
      openings: 1,
      applicantsCount: 17,
      status: 'IN_REVIEW',
      postedDate: '2026-09-02',
      experienceRequired: '6+ Years',
    },
  ];

  candidates: HrmCandidate[] = [
    {
      id: 'cand-01',
      tenantId: 'ten-growth-india',
      jobId: 'job-01',
      jobTitle: 'Senior Full Stack Engineer',
      name: 'Rohan Deshmukh',
      email: 'rohan.d@gmail.com',
      phone: '+91 99201 88320',
      stage: 'TECHNICAL_INTERVIEW',
      appliedDate: '2026-09-12',
      experienceYears: 5.5,
      currentCompany: 'Infosys Ltd',
      rating: 4.8,
      interviewNotes: 'Strong hands-on React/Next.js architecture skills and MongoDB indexing knowledge.',
    },
    {
      id: 'cand-02',
      tenantId: 'ten-growth-india',
      jobId: 'job-01',
      jobTitle: 'Senior Full Stack Engineer',
      name: 'Meera Nambiar',
      email: 'meera.nambiar@yahoo.co.in',
      phone: '+91 98450 12903',
      stage: 'OFFER_MADE',
      appliedDate: '2026-09-11',
      experienceYears: 6.0,
      currentCompany: 'Cognizant',
      rating: 5.0,
      interviewNotes: 'Cleared final round with Aarav. Offered CTC ₹24 LPA. Awaiting joining confirmation.',
    },
    {
      id: 'cand-03',
      tenantId: 'ten-growth-india',
      jobId: 'job-02',
      jobTitle: 'Enterprise Account Manager',
      name: 'Vikramaditya Rathore',
      email: 'vikram.rathore@outlook.com',
      phone: '+91 97110 39820',
      stage: 'MANAGEMENT_ROUND',
      appliedDate: '2026-09-16',
      experienceYears: 7.2,
      currentCompany: 'HCL Technologies',
      rating: 4.5,
      interviewNotes: 'Impressive track record closing ₹50L+ ARR deals in North India BFSI sector.',
    },
  ];

  goals: HrmGoal[] = [
    {
      id: 'goal-01',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-101',
      employeeName: 'Aarav Sharma',
      title: 'Architect & Deploy Multi-Tenant HRM Module to Production',
      category: 'BUSINESS',
      targetDate: '2026-10-15',
      progress: 85,
      status: 'IN_PROGRESS',
      weightage: 40,
      rating: 4.9,
      managerFeedback: 'Exceptional progress separating platforms and ensuring sub-60ms response times.',
    },
    {
      id: 'goal-02',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-103',
      employeeName: 'Rahul Verma',
      title: 'Achieve ₹1.2 Crore Enterprise Q3 Deal Conversions',
      category: 'BUSINESS',
      targetDate: '2026-09-30',
      progress: 92,
      status: 'IN_PROGRESS',
      weightage: 50,
      rating: 4.8,
      managerFeedback: 'Already at ₹1.1 Crore. Closing 2 final deals this week.',
    },
    {
      id: 'goal-03',
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-102',
      employeeName: 'Neha Gupta',
      title: 'Automate 100% Employee Onboarding KYC Verifications',
      category: 'TECHNICAL',
      targetDate: '2026-10-30',
      progress: 75,
      status: 'IN_PROGRESS',
      weightage: 30,
      rating: 4.7,
      managerFeedback: 'Watermarked document viewer has reduced turnaround time by 60%.',
    },
  ];

  tickets: HrmTicket[] = [
    {
      id: 'tick-01',
      tenantId: 'ten-growth-india',
      ticketNumber: 'TKT-HRM-0081',
      employeeId: 'hrm-emp-104',
      employeeName: 'Priya Patel',
      category: 'LEAVE_ATTENDANCE',
      subject: 'Correction of biometric check-in time for 18th Sept',
      description: 'The biometric reader had a timeout while I punched in at 09:25 AM. Kindly regularize from 10:15 AM to 09:25 AM.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      assignedTo: 'Neha Gupta (HR)',
      createdAt: '2026-09-19 11:45 AM',
      comments: [
        { author: 'Priya Patel', role: 'Employee', text: 'Attached security gate register screenshot for verification.', timestamp: '2026-09-19 11:45 AM' },
        { author: 'Neha Gupta', role: 'HR Lead', text: 'Verified with security log. Punctuality flag cleared and time regularized.', timestamp: '2026-09-19 02:10 PM' },
      ],
    },
    {
      id: 'tick-02',
      tenantId: 'ten-growth-india',
      ticketNumber: 'TKT-HRM-0082',
      employeeId: 'hrm-emp-103',
      employeeName: 'Rahul Verma',
      category: 'IT_ASSETS',
      subject: 'Request for secondary 4K 27" monitor for client presentations',
      description: 'Need external display setup for daily sales pipeline demonstrations and remote pitch calls.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTo: 'IT Asset Admin',
      createdAt: '2026-09-21 03:20 PM',
      comments: [
        { author: 'Rahul Verma', role: 'Sales Manager', text: 'Urgent for upcoming US client pitches.', timestamp: '2026-09-21 03:20 PM' },
        { author: 'Neha Gupta', role: 'HR Lead', text: 'Approved under Q3 Sales Tech Budget. Dispatched via courier.', timestamp: '2026-09-22 09:30 AM' },
      ],
    },
  ];

  workflows: HrmWorkflow[] = [
    {
      id: 'wf-01',
      tenantId: 'ten-growth-india',
      title: 'Leave Request Multi-Stage Approval Workflow',
      triggerEvent: 'LEAVE_APPLIED',
      condition: { field: 'days', operator: 'GREATER_THAN', value: 3 },
      steps: [
        { stepName: 'Reporting Manager Review', approverRole: 'MANAGER', timeoutHours: 24 },
        { stepName: 'HR Governance & Quota Verification', approverRole: 'HR', timeoutHours: 48 },
      ],
      action: { type: 'UPDATE_RECORD', details: 'Deduct leave balance from ledger and update employee attendance calendar.' },
      notifications: [
        { targetRole: 'EMPLOYEE', channel: 'EMAIL', message: 'Your leave application of {days} days has been approved.' },
      ],
      isActive: true,
    },
    {
      id: 'wf-02',
      tenantId: 'ten-growth-india',
      title: 'Attendance Late Check-In Automated Alert',
      triggerEvent: 'ATTENDANCE_LATE',
      condition: { field: 'lateMinutes', operator: 'GREATER_THAN', value: 30 },
      steps: [
        { stepName: 'Immediate Notification', approverRole: 'SYSTEM', timeoutHours: 0 },
      ],
      action: { type: 'UPDATE_RECORD', details: 'Flag record as Late Arrival with grace period deduction.' },
      notifications: [
        { targetRole: 'MANAGER', channel: 'IN_APP', message: 'Employee {employeeName} checked in late ({lateMinutes} min).' },
      ],
      isActive: true,
    },
  ];
}

// Global Singleton
const globalForHrm = global as unknown as { hrmStore: HrmDataStore };
export const hrmStore = globalForHrm.hrmStore || new HrmDataStore();
if (process.env.NODE_ENV !== 'production') globalForHrm.hrmStore = hrmStore;
