export type UserRoleType = 'ADMIN' | 'CLIENT' | 'EMPLOYEE' | 'SUPER_ADMIN' | 'ADMIN_HR' | 'MANAGER_TL';

export type EmployeeStatusType = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'UNBLOCKED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRoleType;
  roleDisplayName: string;
  employeeId?: string;
  clientId?: string;
  companyName?: string;
  canBlockEmployees?: boolean;
  canDeleteEmployees?: boolean;
  fullName: string;
  designation: string;
  departmentName?: string;
  isSuspended: boolean;
}

export interface ClientItem {
  id: string;
  clientId: string; // e.g. CLI-00001
  companyName: string;
  contactPerson: string;
  mobile: string;
  email?: string | null;
  address?: string | null;
  industry?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  dateAdded: string;
  userId?: string | null;
  canBlockEmployees?: boolean;
  canDeleteEmployees?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
    activities?: number;
    notes?: number;
    tasks?: number;
  };
  employees?: EmployeeItem[];
}

export interface EmployeeBlockHistoryItem {
  id: string;
  employeeId: string;
  actionType: 'BLOCK' | 'UNBLOCK';
  reason: string;
  remarks?: string | null;
  actionBy: string;
  actionDate: string;
  previousStatus: string;
  newStatus: string;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    client?: {
      clientId: string;
      companyName: string;
    } | null;
  };
}

export interface EmployeeItem {
  id: string;
  employeeId: string; // e.g. GI-EMP-000001
  userId: string;
  clientId?: string | null;
  client?: ClientItem | null;
  
  // Personal Info
  fullName: string;
  fatherMotherName?: string | null;
  dob?: string | null;
  gender?: string | null;
  phone: string;
  personalEmail?: string | null;
  panNumber?: string | null;
  panMasked?: string | null;
  address?: string | null;
  profilePhotoUrl?: string | null;

  // Employment Info
  departmentId?: string | null;
  departmentName?: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  designation: string;
  jobLocation: string;
  location?: string;
  joiningDate: string;
  employmentType: string;
  remarks?: string | null;

  // Status & Block Info
  status: EmployeeStatusType;
  isBlocked: boolean;
  blockedReason?: string | null;
  blockedRemarks?: string | null;
  blockedBy?: string | null;
  blockedAt?: string | null;
  unblockedBy?: string | null;
  unblockedAt?: string | null;

  // Audit Info
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  user?: {
    email: string;
    isActive: boolean;
    isSuspended: boolean;
    role?: {
      name: string;
      displayName: string;
    };
  };
  blockHistories?: EmployeeBlockHistoryItem[];
  _count?: {
    blockHistories?: number;
    documents?: number;
    attendanceRecords?: number;
  };
}

export interface Phase1DashboardStats {
  totalClients: number;
  totalEmployees: number;
  activeEmployees: number;
  blockedEmployees: number;
  inactiveEmployees: number;
  recentOnboardings: EmployeeItem[];
  recentBlockHistories: EmployeeBlockHistoryItem[];
  clientsList: ClientItem[];
}
