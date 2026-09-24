import { prisma, isValidObjectId, getClientLookup, getEmployeeLookup } from '../prisma';
import { logAuditEvent, maskPAN } from '../audit';
import { AuthUser } from '@/types';

// ============================================================================
// 1. DATA TYPES & INTERFACES
// ============================================================================

export interface ShiftPolicyItem {
  id: string;
  name: string;
  code: string;
  clientId?: string | null;
  clientName?: string | null;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  maxBreaks: number;
  weeklyOffDays: string[]; // ['SATURDAY', 'SUNDAY']
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  isActive: boolean;
  description?: string | null;
  assignedEmployeesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  holidayType: 'PUBLIC' | 'COMPANY' | 'CLIENT_SPECIFIC' | 'OPTIONAL' | 'WEEKLY_OFF';
  type?: 'NATIONAL' | 'STATE' | 'COMPANY' | 'OPTIONAL' | 'CLIENT_SPECIFIC';
  clientId?: string | null;
  clientName?: string | null;
  year: number;
  description?: string | null;
  isMandatory?: boolean;
  createdAt: string;
}

export interface OffboardingClearanceItem {
  id: string;
  offboardingId: string;
  employeeId: string;
  employeeDisplayId: string;
  employeeName: string;
  clientId?: string | null;
  clientName?: string | null;
  exitType: 'RESIGNATION' | 'TERMINATION' | 'CONTRACT_END' | 'MUTUAL_SEPARATION' | 'RETIREMENT';
  exitReason: string;
  noticeDate: string; // ISO / YYYY-MM-DD
  lastWorkingDay: string; // ISO / YYYY-MM-DD
  stage: 'EXIT_INITIATED' | 'NOTICE_PERIOD' | 'CLEARANCE' | 'ACCESS_REVOCATION' | 'FINAL_REVIEW' | 'EXITED' | 'ARCHIVED';
  clientReleaseStatus: 'PENDING' | 'CLEARED' | 'NOT_APPLICABLE';
  managerClearance: 'PENDING' | 'CLEARED';
  taskHandoverStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assetReturnStatus: 'PENDING' | 'RETURNED' | 'WAIVED';
  documentClearance: 'PENDING' | 'CLEARED';
  accessRevoked: boolean;
  finalAttendanceReview: boolean;
  finalLeaveReview: boolean;
  exitNotes?: string | null;
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string | null;
}

export interface LifecycleEventItem {
  id: string;
  employeeId: string;
  fromStage: string;
  toStage: string;
  effectiveDate: string;
  actorId: string;
  actorName: string;
  reason: string;
  remarks?: string | null;
  createdAt: string;
}

export interface TimesheetSummaryItem {
  id: string;
  timesheetId: string;
  employeeId: string;
  employeeDisplayId: string;
  employeeName: string;
  department: string;
  clientId?: string | null;
  clientName?: string | null;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodIdentifier: string; // e.g. "2026-09"
  startDate: string;
  endDate: string;
  scheduledHours: number;
  workedHours: number;
  breakHours: number;
  overtimeHours: number;
  regularizedHours: number;
  approvedHours: number;
  missingPunchesCount: number;
  daysPresent: number;
  daysAbsent: number;
  daysOnLeave: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  remarks?: string | null;
}

// Persistent setting keys in SystemSetting
const SHIFTS_KEY = 'EMS_SHIFT_POLICIES';
const HOLIDAYS_KEY = 'EMS_HOLIDAY_CALENDAR';
const OFFBOARDING_KEY = 'EMS_OFFBOARDING_RECORDS';
const LIFECYCLE_KEY = 'EMS_LIFECYCLE_EVENTS';
const TIMESHEETS_KEY = 'EMS_TIMESHEET_RECORDS';

// ============================================================================
// 2. SHIFTS & POLICIES MANAGEMENT
// ============================================================================

const DEFAULT_SHIFTS: ShiftPolicyItem[] = [
  {
    id: 'SHIFT-GEN-01',
    name: 'General Shift',
    code: 'GEN-10-19',
    clientId: null,
    clientName: 'All Clients (Global)',
    startTime: '10:00',
    endTime: '19:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    maxBreaks: 2,
    weeklyOffDays: ['SATURDAY', 'SUNDAY'],
    overtimeThresholdHours: 9.0,
    overtimeMultiplier: 1.5,
    isActive: true,
    description: 'Standard enterprise business hours with 15-minute grace check-in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SHIFT-MORN-02',
    name: 'Morning Shift',
    code: 'MORN-09-18',
    clientId: null,
    clientName: 'All Clients (Global)',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    maxBreaks: 2,
    weeklyOffDays: ['SUNDAY'],
    overtimeThresholdHours: 9.0,
    overtimeMultiplier: 1.5,
    isActive: true,
    description: 'Early morning operations and field support shift',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SHIFT-NIGHT-03',
    name: 'Night Logistics Shift',
    code: 'NIGHT-20-05',
    clientId: null,
    clientName: 'All Clients (Global)',
    startTime: '20:00',
    endTime: '05:00',
    gracePeriodMinutes: 20,
    breakDurationMinutes: 60,
    maxBreaks: 3,
    weeklyOffDays: ['MONDAY'],
    overtimeThresholdHours: 9.0,
    overtimeMultiplier: 2.0,
    isActive: true,
    description: 'Night supply chain and dispatch operations',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getShiftPolicies(filter?: { clientId?: string }): Promise<ShiftPolicyItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: SHIFTS_KEY } });
    let list: ShiftPolicyItem[] = setting?.value ? JSON.parse(setting.value) : DEFAULT_SHIFTS;

    if (!setting) {
      await prisma.systemSetting.create({
        data: {
          key: SHIFTS_KEY,
          value: JSON.stringify(DEFAULT_SHIFTS),
          category: 'EMS_POLICY',
          description: 'Employee Shift Policies & Schedules',
        },
      });
    }

    if (filter?.clientId && filter.clientId !== 'ALL') {
      list = list.filter((s) => !s.clientId || s.clientId === filter.clientId);
    }

    // Count assigned employees dynamically
    const allEmployees = await prisma.employee.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { shiftStartTime: true, shiftEndTime: true, clientId: true },
    });

    return list.map((shift) => {
      const count = allEmployees.filter((e) => {
        const matchesTime = e.shiftStartTime === shift.startTime && e.shiftEndTime === shift.endTime;
        const matchesClient = !shift.clientId || e.clientId === shift.clientId;
        return matchesTime && matchesClient;
      }).length;
      return { ...shift, assignedEmployeesCount: count };
    });
  } catch (err) {
    console.error('getShiftPolicies error:', err);
    return DEFAULT_SHIFTS;
  }
}

export async function saveShiftPolicy(data: Partial<ShiftPolicyItem>, actor: AuthUser): Promise<ShiftPolicyItem> {
  const shifts = await getShiftPolicies();
  let clientName: string | null = null;

  if (data.clientId) {
    const client = await prisma.client.findFirst({ where: getClientLookup(data.clientId), select: { companyName: true, id: true } });
    clientName = client?.companyName || null;
    data.clientId = client?.id || data.clientId;
  }

  let savedItem: ShiftPolicyItem;
  if (data.id && shifts.some((s) => s.id === data.id)) {
    const idx = shifts.findIndex((s) => s.id === data.id);
    savedItem = {
      ...shifts[idx],
      ...data,
      clientName: clientName !== undefined ? clientName : shifts[idx].clientName,
      updatedAt: new Date().toISOString(),
    } as ShiftPolicyItem;
    shifts[idx] = savedItem;
  } else {
    savedItem = {
      id: `SHIFT-${Date.now().toString(36).toUpperCase()}`,
      name: data.name || 'Custom Shift',
      code: data.code || `SHIFT-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: data.clientId || null,
      clientName: clientName || (data.clientId ? 'Client Specific' : 'All Clients (Global)'),
      startTime: data.startTime || '09:30',
      endTime: data.endTime || '18:30',
      gracePeriodMinutes: data.gracePeriodMinutes ?? 15,
      breakDurationMinutes: data.breakDurationMinutes ?? 60,
      maxBreaks: data.maxBreaks ?? 2,
      weeklyOffDays: data.weeklyOffDays || ['SATURDAY', 'SUNDAY'],
      overtimeThresholdHours: data.overtimeThresholdHours ?? 9.0,
      overtimeMultiplier: data.overtimeMultiplier ?? 1.5,
      isActive: data.isActive ?? true,
      description: data.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    shifts.unshift(savedItem);
  }

  await prisma.systemSetting.upsert({
    where: { key: SHIFTS_KEY },
    update: { value: JSON.stringify(shifts), updatedAt: new Date() },
    create: { key: SHIFTS_KEY, value: JSON.stringify(shifts), category: 'EMS_POLICY', description: 'Employee Shift Policies & Schedules' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: data.id ? 'UPDATE_SHIFT_POLICY' : 'CREATE_SHIFT_POLICY',
    entityType: 'ATTENDANCE',
    entityId: savedItem.id,
    newData: savedItem,
    status: 'SUCCESS',
  });

  return savedItem;
}

export async function deleteShiftPolicy(id: string, actor: AuthUser): Promise<boolean> {
  const shifts = await getShiftPolicies();
  const filtered = shifts.filter((s) => s.id !== id);
  if (filtered.length === shifts.length) return false;

  await prisma.systemSetting.upsert({
    where: { key: SHIFTS_KEY },
    update: { value: JSON.stringify(filtered), updatedAt: new Date() },
    create: { key: SHIFTS_KEY, value: JSON.stringify(filtered), category: 'EMS_POLICY', description: 'Employee Shift Policies & Schedules' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'DELETE_SHIFT_POLICY',
    entityType: 'ATTENDANCE',
    entityId: id,
    status: 'SUCCESS',
  });

  return true;
}

// ============================================================================
// 3. HOLIDAY CALENDAR MANAGEMENT
// ============================================================================

const DEFAULT_HOLIDAYS_2026: HolidayItem[] = [
  { id: 'HOL-2026-01', name: 'Republic Day', date: '2026-01-26', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'National Holiday', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-02', name: 'Maha Shivratri', date: '2026-02-15', holidayType: 'COMPANY', type: 'COMPANY', clientId: null, clientName: 'Global', year: 2026, description: 'Festival Holiday', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-03', name: 'Holi', date: '2026-03-04', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'Festival of Colors', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-04', name: 'Id-ul-Fitr', date: '2026-03-21', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'Eid-ul-Fitr', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-05', name: 'Independence Day', date: '2026-08-15', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'National Holiday', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-06', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'National Holiday', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-07', name: 'Dussehra', date: '2026-10-20', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'Vijayadashami', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-08', name: 'Diwali (Deepavali)', date: '2026-11-08', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'Festival of Lights', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'HOL-2026-09', name: 'Christmas Day', date: '2026-12-25', holidayType: 'PUBLIC', type: 'NATIONAL', clientId: null, clientName: 'Global', year: 2026, description: 'Christmas', isMandatory: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

export async function getHolidays(filter?: { year?: number; clientId?: string }): Promise<HolidayItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: HOLIDAYS_KEY } });
    let list: HolidayItem[] = setting?.value ? JSON.parse(setting.value) : DEFAULT_HOLIDAYS_2026;

    if (!setting) {
      await prisma.systemSetting.create({
        data: {
          key: HOLIDAYS_KEY,
          value: JSON.stringify(DEFAULT_HOLIDAYS_2026),
          category: 'EMS_HOLIDAYS',
          description: 'Official Corporate and Client Holiday Calendars',
        },
      });
    }

    if (filter?.year) {
      list = list.filter((h) => h.year === filter.year || h.date.startsWith(`${filter.year}-`));
    }

    if (filter?.clientId && filter.clientId !== 'ALL') {
      list = list.filter((h) => !h.clientId || h.clientId === filter.clientId);
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('getHolidays error:', err);
    return DEFAULT_HOLIDAYS_2026;
  }
}

export async function saveHoliday(data: Partial<HolidayItem>, actor: AuthUser): Promise<HolidayItem> {
  const holidays = await getHolidays();
  let clientName: string | null = null;

  if (data.clientId) {
    const client = await prisma.client.findFirst({ where: getClientLookup(data.clientId), select: { companyName: true, id: true } });
    clientName = client?.companyName || null;
    data.clientId = client?.id || data.clientId;
  }

  const dateStr = data.date || new Date().toISOString().split('T')[0];
  const year = data.year || parseInt(dateStr.split('-')[0], 10) || new Date().getFullYear();

  let savedItem: HolidayItem;
  if (data.id && holidays.some((h) => h.id === data.id)) {
    const idx = holidays.findIndex((h) => h.id === data.id);
    savedItem = {
      ...holidays[idx],
      ...data,
      year,
      clientName: clientName !== undefined ? clientName : holidays[idx].clientName,
    } as HolidayItem;
    holidays[idx] = savedItem;
  } else {
    savedItem = {
      id: `HOL-${Date.now().toString(36).toUpperCase()}`,
      name: data.name || 'Company Holiday',
      date: dateStr,
      holidayType: data.holidayType || 'PUBLIC',
      clientId: data.clientId || null,
      clientName: clientName || (data.clientId ? 'Client Specific' : 'Global'),
      year,
      description: data.description || null,
      createdAt: new Date().toISOString(),
    };
    holidays.push(savedItem);
  }

  await prisma.systemSetting.upsert({
    where: { key: HOLIDAYS_KEY },
    update: { value: JSON.stringify(holidays), updatedAt: new Date() },
    create: { key: HOLIDAYS_KEY, value: JSON.stringify(holidays), category: 'EMS_HOLIDAYS', description: 'Official Corporate and Client Holiday Calendars' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: data.id ? 'UPDATE_HOLIDAY' : 'CREATE_HOLIDAY',
    entityType: 'ATTENDANCE',
    entityId: savedItem.id,
    newData: savedItem,
    status: 'SUCCESS',
  });

  return savedItem;
}

export async function deleteHoliday(id: string, actor: AuthUser): Promise<boolean> {
  const holidays = await getHolidays();
  const filtered = holidays.filter((h) => h.id !== id);
  if (filtered.length === holidays.length) return false;

  await prisma.systemSetting.upsert({
    where: { key: HOLIDAYS_KEY },
    update: { value: JSON.stringify(filtered), updatedAt: new Date() },
    create: { key: HOLIDAYS_KEY, value: JSON.stringify(filtered), category: 'EMS_HOLIDAYS', description: 'Official Corporate and Client Holiday Calendars' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'DELETE_HOLIDAY',
    entityType: 'ATTENDANCE',
    entityId: id,
    status: 'SUCCESS',
  });

  return true;
}

// ============================================================================
// 4. EMPLOYEE LIFECYCLE & STAGE TRANSITIONS
// ============================================================================

export const LIFECYCLE_STAGES = [
  'PREBOARDING',
  'ONBOARDING',
  'PROBATION',
  'ACTIVE',
  'ON_NOTICE',
  'EXIT_INITIATED',
  'OFFBOARDING',
  'EXITED',
  'ARCHIVED',
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

export async function getLifecycleEvents(employeeId?: string): Promise<LifecycleEventItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: LIFECYCLE_KEY } });
    if (!setting?.value) return [];
    let list: LifecycleEventItem[] = JSON.parse(setting.value);
    if (employeeId) {
      list = list.filter((e) => e.employeeId === employeeId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    return [];
  }
}

export async function transitionLifecycleStage(
  employeeId: string,
  params: {
    toStage: LifecycleStage;
    reason: string;
    remarks?: string;
    effectiveDate?: string;
  },
  actor: AuthUser
): Promise<{ success: boolean; event: LifecycleEventItem; employee: any }> {
  const employee = await prisma.employee.findFirst({
    where: getEmployeeLookup(employeeId),
    include: { client: true, user: true },
  });
  if (!employee) throw new Error('Employee not found');

  const fromStage = (employee as any).lifecycleStage || (employee.status === 'BLOCKED' ? 'ACTIVE' : employee.status);
  const toStage = params.toStage;

  // Determine updated status & access triggers
  let updatedStatus = employee.status;
  let isBlocked = employee.isBlocked;
  let shouldDeactivateUser = false;
  let shouldReactivateUser = false;

  if (toStage === 'PREBOARDING' || toStage === 'ONBOARDING' || toStage === 'PROBATION' || toStage === 'ACTIVE') {
    updatedStatus = 'ACTIVE';
    isBlocked = false;
    if (fromStage === 'EXITED' || fromStage === 'ARCHIVED' || employee.isBlocked) {
      shouldReactivateUser = true;
    }
  } else if (toStage === 'ON_NOTICE') {
    updatedStatus = 'ACTIVE';
  } else if (toStage === 'EXIT_INITIATED' || toStage === 'OFFBOARDING') {
    updatedStatus = 'INACTIVE';
  } else if (toStage === 'EXITED') {
    updatedStatus = 'EXITED';
    isBlocked = true;
    shouldDeactivateUser = true;
  } else if (toStage === 'ARCHIVED') {
    updatedStatus = 'ARCHIVED';
    isBlocked = true;
    shouldDeactivateUser = true;
  }

  // Update employee record in DB
  const updatedEmp = await prisma.employee.update({
    where: { id: employee.id },
    data: {
      status: updatedStatus,
      isBlocked,
      remarks: params.remarks ? `${employee.remarks || ''}\n[Lifecycle: ${toStage}] ${params.remarks}`.trim() : employee.remarks,
      updatedBy: `${actor.fullName} (${actor.employeeId || 'ADMIN'})`,
    },
    include: { client: true, user: true },
  });

  // Security side effect: If EXITED or ARCHIVED, purge active sessions and deactivate user login
  if (shouldDeactivateUser && employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false, isSuspended: true },
    }).catch(() => {});

    await prisma.activeUserSession.deleteMany({
      where: { userId: employee.userId },
    }).catch(() => {});
  } else if (shouldReactivateUser && employee.userId) {
    // Preserve employee history and restore active access on rejoining
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: true, isSuspended: false },
    }).catch(() => {});
  }

  // Record lifecycle event history
  const event: LifecycleEventItem = {
    id: `EVT-${Date.now().toString(36).toUpperCase()}`,
    employeeId: employee.employeeId,
    fromStage,
    toStage,
    effectiveDate: params.effectiveDate || new Date().toISOString(),
    actorId: actor.employeeId || actor.id,
    actorName: actor.fullName,
    reason: params.reason,
    remarks: params.remarks || null,
    createdAt: new Date().toISOString(),
  };

  const events = await getLifecycleEvents();
  events.unshift(event);

  await prisma.systemSetting.upsert({
    where: { key: LIFECYCLE_KEY },
    update: { value: JSON.stringify(events), updatedAt: new Date() },
    create: { key: LIFECYCLE_KEY, value: JSON.stringify(events), category: 'EMS_LIFECYCLE', description: 'Employee Lifecycle Stage Transitions' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'LIFECYCLE_STAGE_CHANGE',
    entityType: 'EMPLOYEE',
    entityId: employee.employeeId,
    previousData: { lifecycleStage: fromStage, status: employee.status },
    newData: { lifecycleStage: toStage, status: updatedStatus, isBlocked },
    reason: `${params.reason}${params.remarks ? ' - ' + params.remarks : ''}`,
    status: 'SUCCESS',
  });

  return { success: true, event, employee: updatedEmp };
}

// ============================================================================
// 5. OFFBOARDING & CLEARANCE WORKFLOW
// ============================================================================

export async function getOffboardings(filter?: { clientId?: string; stage?: string }): Promise<OffboardingClearanceItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: OFFBOARDING_KEY } });
    if (!setting?.value) return [];
    let list: OffboardingClearanceItem[] = JSON.parse(setting.value);

    if (filter?.clientId && filter.clientId !== 'ALL') {
      list = list.filter((o) => o.clientId === filter.clientId);
    }
    if (filter?.stage && filter.stage !== 'ALL') {
      list = list.filter((o) => o.stage === filter.stage);
    }

    return list.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());
  } catch (err) {
    return [];
  }
}

export async function initiateOffboarding(
  data: {
    employeeId: string;
    exitType: 'RESIGNATION' | 'TERMINATION' | 'CONTRACT_END' | 'MUTUAL_SEPARATION' | 'RETIREMENT';
    exitReason: string;
    noticeDate: string;
    lastWorkingDay: string;
    exitNotes?: string;
  },
  actor: AuthUser
): Promise<OffboardingClearanceItem> {
  const employee = await prisma.employee.findFirst({
    where: getEmployeeLookup(data.employeeId),
    include: { client: true },
  });
  if (!employee) throw new Error('Employee not found');

  const existingList = await getOffboardings();
  const existing = existingList.find((o) => (o.employeeId === employee.id || o.employeeDisplayId === employee.employeeId) && o.stage !== 'EXITED' && o.stage !== 'ARCHIVED');
  if (existing) throw new Error('An active offboarding workflow is already in progress for this employee.');

  const offboardingItem: OffboardingClearanceItem = {
    id: `OFF-${Date.now().toString(36).toUpperCase()}`,
    offboardingId: `OFF-${Math.floor(100000 + Math.random() * 900000)}`,
    employeeId: employee.id,
    employeeDisplayId: employee.employeeId,
    employeeName: employee.fullName,
    clientId: employee.clientId || null,
    clientName: employee.client?.companyName || 'Internal Staff',
    exitType: data.exitType,
    exitReason: data.exitReason,
    noticeDate: data.noticeDate,
    lastWorkingDay: data.lastWorkingDay,
    stage: 'EXIT_INITIATED',
    clientReleaseStatus: employee.clientId ? 'PENDING' : 'NOT_APPLICABLE',
    managerClearance: 'PENDING',
    taskHandoverStatus: 'PENDING',
    assetReturnStatus: 'PENDING',
    documentClearance: 'PENDING',
    accessRevoked: false,
    finalAttendanceReview: false,
    finalLeaveReview: false,
    exitNotes: data.exitNotes || null,
    initiatedBy: actor.fullName,
    initiatedAt: new Date().toISOString(),
    completedAt: null,
  };

  existingList.unshift(offboardingItem);

  await prisma.systemSetting.upsert({
    where: { key: OFFBOARDING_KEY },
    update: { value: JSON.stringify(existingList), updatedAt: new Date() },
    create: { key: OFFBOARDING_KEY, value: JSON.stringify(existingList), category: 'EMS_OFFBOARDING', description: 'Employee Offboarding & Clearances' },
  });

  // Also record lifecycle event
  await transitionLifecycleStage(
    employee.employeeId,
    {
      toStage: 'EXIT_INITIATED',
      reason: `Offboarding initiated (${data.exitType}): ${data.exitReason}`,
      remarks: data.exitNotes,
      effectiveDate: data.noticeDate,
    },
    actor
  );

  return offboardingItem;
}

export async function updateOffboardingClearance(
  id: string,
  updates: Partial<OffboardingClearanceItem>,
  actor: AuthUser
): Promise<OffboardingClearanceItem> {
  const list = await getOffboardings();
  const idx = list.findIndex((o) => o.id === id || o.offboardingId === id);
  if (idx === -1) throw new Error('Offboarding record not found');

  const current = list[idx];
  const updated: OffboardingClearanceItem = {
    ...current,
    ...updates,
  };

  // Check if all clearances are complete
  const allClear =
    (updated.clientReleaseStatus === 'CLEARED' || updated.clientReleaseStatus === 'NOT_APPLICABLE') &&
    updated.managerClearance === 'CLEARED' &&
    updated.taskHandoverStatus === 'COMPLETED' &&
    (updated.assetReturnStatus === 'RETURNED' || updated.assetReturnStatus === 'WAIVED') &&
    updated.documentClearance === 'CLEARED' &&
    updated.finalAttendanceReview &&
    updated.finalLeaveReview;

  if (allClear && updated.stage !== 'EXITED' && updated.stage !== 'ARCHIVED') {
    updated.stage = 'FINAL_REVIEW';
  }

  // If access is marked revoked, execute security revocation
  if (updates.accessRevoked && !current.accessRevoked) {
    const employee = await prisma.employee.findUnique({
      where: { id: current.employeeId },
      select: { userId: true },
    });
    if (employee?.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive: false, isSuspended: true },
      }).catch(() => {});
      await prisma.activeUserSession.deleteMany({
        where: { userId: employee.userId },
      }).catch(() => {});
    }
  }

  // If stage transitions to EXITED, complete offboarding
  if (updates.stage === 'EXITED' && current.stage !== 'EXITED') {
    updated.completedAt = new Date().toISOString();
    await transitionLifecycleStage(
      current.employeeDisplayId,
      {
        toStage: 'EXITED',
        reason: 'Offboarding clearances finalized and signed off',
        remarks: updated.exitNotes || undefined,
      },
      actor
    );
  }

  list[idx] = updated;

  await prisma.systemSetting.upsert({
    where: { key: OFFBOARDING_KEY },
    update: { value: JSON.stringify(list), updatedAt: new Date() },
    create: { key: OFFBOARDING_KEY, value: JSON.stringify(list), category: 'EMS_OFFBOARDING', description: 'Employee Offboarding & Clearances' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'UPDATE_OFFBOARDING_CLEARANCE',
    entityType: 'EMPLOYEE',
    entityId: updated.offboardingId,
    newData: updated,
    status: 'SUCCESS',
  });

  return updated;
}

// ============================================================================
// 6. CONTROLLED SOFT ARCHIVE (DELETION GOVERNANCE)
// ============================================================================

export async function archiveEmployee(
  employeeId: string,
  params: { reason: string; remarks?: string },
  actor: AuthUser
): Promise<{ success: boolean; message: string }> {
  const employee = await prisma.employee.findFirst({
    where: getEmployeeLookup(employeeId),
    include: { client: true, user: true },
  });
  if (!employee) throw new Error('Employee not found');

  if (employee.employeeId === 'GI-EMP-000001' || employee.user?.roleId === actor.id) {
    throw new Error('Platform Super Administrator cannot be archived.');
  }

  // Soft archive: set status = ARCHIVED, isBlocked = true
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      status: 'ARCHIVED',
      isBlocked: true,
      blockedReason: `Archived: ${params.reason}`,
      blockedRemarks: params.remarks || 'Employee record archived via Enterprise Deletion Governance',
      blockedBy: actor.fullName,
      blockedAt: new Date(),
      updatedBy: `${actor.fullName} (${actor.employeeId || 'ADMIN'})`,
    },
  });

  // Revoke user login & sessions
  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false, isSuspended: true },
    }).catch(() => {});

    await prisma.activeUserSession.deleteMany({
      where: { userId: employee.userId },
    }).catch(() => {});
  }

  // Record lifecycle event
  await transitionLifecycleStage(
    employee.employeeId,
    {
      toStage: 'ARCHIVED',
      reason: params.reason,
      remarks: params.remarks || 'Archived per data retention policy',
    },
    actor
  );

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'ARCHIVE_EMPLOYEE',
    entityType: 'EMPLOYEE',
    entityId: employee.employeeId,
    reason: params.reason,
    previousData: { status: employee.status, isBlocked: employee.isBlocked },
    newData: { status: 'ARCHIVED', isBlocked: true },
    status: 'SUCCESS',
  });

  return {
    success: true,
    message: `Employee ${employee.employeeId} (${employee.fullName}) has been safely archived. All historical attendance, timesheet, leave, and audit data remain linked.`,
  };
}

export async function restoreEmployee(
  employeeId: string,
  params: { reason: string },
  actor: AuthUser
): Promise<{ success: boolean; message: string }> {
  const employee = await prisma.employee.findFirst({
    where: getEmployeeLookup(employeeId),
    include: { user: true },
  });
  if (!employee) throw new Error('Employee not found');

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      status: 'ACTIVE',
      isBlocked: false,
      blockedReason: null,
      blockedRemarks: null,
      unblockedBy: actor.fullName,
      unblockedAt: new Date(),
      updatedBy: `${actor.fullName} (${actor.employeeId || 'ADMIN'})`,
    },
  });

  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: true, isSuspended: false },
    }).catch(() => {});
  }

  await transitionLifecycleStage(
    employee.employeeId,
    {
      toStage: 'ACTIVE',
      reason: `Restored from archive: ${params.reason}`,
    },
    actor
  );

  return { success: true, message: `Employee ${employee.employeeId} restored to Active status.` };
}

// ============================================================================
// 7. TIMESHEETS AGGREGATION & APPROVAL
// ============================================================================

export async function calculateTimesheets(filter: {
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodIdentifier: string; // e.g. "2026-09" or "2026-09-23"
  clientId?: string;
  employeeId?: string;
}): Promise<TimesheetSummaryItem[]> {
  try {
    const { periodType, periodIdentifier, clientId, employeeId } = filter;

    // Determine start and end dates
    let startDate: string;
    let endDate: string;

    if (periodType === 'DAILY') {
      startDate = periodIdentifier;
      endDate = periodIdentifier;
    } else if (periodType === 'MONTHLY') {
      const [y, m] = periodIdentifier.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${periodIdentifier}-01`;
      endDate = `${periodIdentifier}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Weekly: format YYYY-MM-DD (start of week)
      startDate = periodIdentifier;
      const d = new Date(startDate);
      d.setDate(d.getDate() + 6);
      endDate = d.toISOString().split('T')[0];
    }

    // Query employees
    const empWhere: any = {
      employeeId: { not: 'GI-EMP-000001' },
      status: { not: 'ARCHIVED' },
    };
    if (clientId && clientId !== 'ALL') empWhere.clientId = clientId;
    if (employeeId) empWhere.employeeId = employeeId;

    const employees = await prisma.employee.findMany({
      where: empWhere,
      include: { client: true, department: true },
      orderBy: { employeeId: 'asc' },
    });

    // Query attendance records for period
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        employee: empWhere,
      },
    });

    // Query leaves for period
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    const shiftPolicies = await getShiftPolicies();
    const defaultShift = shiftPolicies[0] || DEFAULT_SHIFTS[0];

    const results: TimesheetSummaryItem[] = [];

    for (const emp of employees) {
      const empAttendances = attendanceRecords.filter((a) => a.employeeId === emp.id);
      const empLeaves = leaves.filter((l) => l.employeeId === emp.id);

      let totalWorkedMinutes = 0;
      let totalBreakMinutes = 0;
      let totalOvertimeMinutes = 0;
      let missingPunches = 0;
      let daysPresent = 0;

      for (const att of empAttendances) {
        if (att.status === 'PRESENT' || att.status === 'HALF_DAY') {
          daysPresent++;
        }
        totalWorkedMinutes += att.totalWorkMinutes || 0;
        totalBreakMinutes += att.totalBreakMinutes || 0;
        totalOvertimeMinutes += att.overtimeMinutes || 0;
        if (!att.checkOutTime && att.checkInTime) {
          missingPunches++;
        }
      }

      // Calculate scheduled hours based on working days in period (excluding Sundays)
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      let workingDays = 0;
      const cur = new Date(startD);
      while (cur <= endD) {
        if (cur.getDay() !== 0) workingDays++; // skip Sunday
        cur.setDate(cur.getDate() + 1);
      }

      const scheduledHours = workingDays * 8.0;
      const workedHours = parseFloat((totalWorkedMinutes / 60).toFixed(1));
      const breakHours = parseFloat((totalBreakMinutes / 60).toFixed(1));
      const overtimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(1));
      const regularizedHours = 0;
      const approvedHours = Math.min(workedHours, scheduledHours + overtimeHours);
      const daysAbsent = Math.max(0, workingDays - daysPresent - empLeaves.length);

      const timesheetId = `TS-${emp.employeeId}-${periodIdentifier}`;

      results.push({
        id: timesheetId,
        timesheetId,
        employeeId: emp.id,
        employeeDisplayId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.departmentName || emp.department?.name || 'General Operations',
        clientId: emp.clientId,
        clientName: emp.client?.companyName || 'Internal Staff',
        periodType,
        periodIdentifier,
        startDate,
        endDate,
        scheduledHours,
        workedHours,
        breakHours,
        overtimeHours,
        regularizedHours,
        approvedHours,
        missingPunchesCount: missingPunches,
        daysPresent,
        daysAbsent,
        daysOnLeave: empLeaves.length,
        status: workedHours > 0 ? 'SUBMITTED' : 'DRAFT',
      });
    }

    return results;
  } catch (err) {
    console.error('calculateTimesheets error:', err);
    return [];
  }
}

export async function approveTimesheet(
  timesheetId: string,
  actor: AuthUser,
  remarks?: string
): Promise<{ success: boolean; timesheetId: string }> {
  // Store approval record in SystemSetting
  const setting = await prisma.systemSetting.findUnique({ where: { key: TIMESHEETS_KEY } });
  const approvals: Record<string, any> = setting?.value ? JSON.parse(setting.value) : {};

  approvals[timesheetId] = {
    status: 'APPROVED',
    approvedBy: actor.fullName,
    approvedById: actor.employeeId || actor.id,
    approvedAt: new Date().toISOString(),
    remarks: remarks || 'Timesheet reviewed and verified by supervisor',
  };

  await prisma.systemSetting.upsert({
    where: { key: TIMESHEETS_KEY },
    update: { value: JSON.stringify(approvals), updatedAt: new Date() },
    create: { key: TIMESHEETS_KEY, value: JSON.stringify(approvals), category: 'EMS_TIMESHEETS', description: 'Timesheet Verifications and Signoffs' },
  });

  await logAuditEvent({
    actorUserId: actor.id,
    actorEmployeeId: actor.employeeId || 'ADMIN',
    action: 'APPROVE_TIMESHEET',
    entityType: 'ATTENDANCE',
    entityId: timesheetId,
    reason: remarks || 'Timesheet hours validated and approved',
    status: 'SUCCESS',
  });

  return { success: true, timesheetId };
}

// ============================================================================
// 8. WORKFORCE & EMS OVERVIEW METRICS
// ============================================================================

export async function getEmsOverviewMetrics(clientId?: string | null): Promise<any> {
  try {
    const empWhere: any = {
      employeeId: { not: 'GI-EMP-000001' },
      user: {
        role: { name: { notIn: ['ADMIN', 'SUPER_ADMIN'] } },
      },
    };
    if (clientId && clientId !== 'ALL') {
      const resolved = await prisma.client.findFirst({ where: getClientLookup(clientId), select: { id: true } });
      if (resolved) empWhere.clientId = resolved.id;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Parallel fetch counts
    const [
      totalEmployees,
      activeEmployees,
      blockedEmployees,
      todayAttendances,
      pendingLeaves,
      regularizations,
      offboardings,
      allClients,
    ] = await Promise.all([
      prisma.employee.count({ where: empWhere }),
      prisma.employee.count({ where: { ...empWhere, status: 'ACTIVE', isBlocked: false } }),
      prisma.employee.count({ where: { ...empWhere, OR: [{ status: 'BLOCKED' }, { isBlocked: true }] } }),
      prisma.attendance.findMany({
        where: { date: todayStr, employee: empWhere },
        select: { status: true, isLate: true, checkOutTime: true },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING', employee: empWhere } }),
      (async () => {
        const { getRegularizationRequests } = await import('../regularization');
        const reqs = await getRegularizationRequests({ status: 'PENDING' });
        return reqs.length;
      })(),
      getOffboardings({ clientId: clientId || undefined }),
      prisma.client.findMany({ select: { id: true, clientId: true, companyName: true }, take: 10 }),
    ]);

    const presentToday = todayAttendances.filter((a) => a.status === 'PRESENT').length;
    const lateToday = todayAttendances.filter((a) => a.isLate).length;
    const missingCheckins = Math.max(0, activeEmployees - todayAttendances.length);
    const onNoticeCount = offboardings.filter((o) => o.stage === 'NOTICE_PERIOD' || o.stage === 'EXIT_INITIATED').length;
    const exitedCount = offboardings.filter((o) => o.stage === 'EXITED').length;

    // Client-wise distribution
    const clientDistribution = await Promise.all(
      allClients.slice(0, 6).map(async (c) => {
        const count = await prisma.employee.count({ where: { clientId: c.id, status: { not: 'ARCHIVED' } } });
        return {
          id: c.id,
          clientId: c.clientId,
          companyName: c.companyName,
          employeeCount: count,
        };
      })
    );

    return {
      kpis: {
        totalEmployees,
        activeEmployees,
        onNoticeCount,
        exitedCount,
        blockedEmployees,
        pendingLeaves,
        pendingRegularizations: regularizations,
        missingCheckins,
        presentToday,
        lateToday,
      },
      clientDistribution: clientDistribution.filter((c) => c.employeeCount > 0),
      todayDate: todayStr,
    };
  } catch (err) {
    console.error('getEmsOverviewMetrics error:', err);
    return {
      kpis: {
        totalEmployees: 0,
        activeEmployees: 0,
        onNoticeCount: 0,
        exitedCount: 0,
        blockedEmployees: 0,
        pendingLeaves: 0,
        pendingRegularizations: 0,
        missingCheckins: 0,
        presentToday: 0,
        lateToday: 0,
      },
      clientDistribution: [],
      todayDate: new Date().toISOString().split('T')[0],
    };
  }
}
