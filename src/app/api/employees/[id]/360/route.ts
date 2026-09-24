import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup, isValidObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { maskPAN } from '@/lib/audit';
import { getLifecycleEvents, calculateTimesheets } from '@/lib/services/ems-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
      include: {
        client: true,
        department: true,
        team: true,
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            isSuspended: true,
            lastLoginAt: true,
            createdAt: true,
            role: true,
            isDelegated: true,
            delegatedPermissions: true,
            sessions: {
              where: { isValid: true },
              orderBy: { lastActiveAt: 'desc' },
              take: 5,
            },
          },
        },
        reportingManager: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            phone: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            status: true,
          },
        },
        blockHistories: {
          orderBy: { actionDate: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 31,
          include: { breaks: true },
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        assignedCrmTasks: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Role-based boundary enforcement
    const isAdmin = isAdminOrHR(user.role);
    if (!isAdmin) {
      if (user.role === 'CLIENT') {
        const isClientEmp =
          user.clientId === employee.client?.clientId ||
          user.clientId === employee.clientId ||
          user.id === employee.client?.userId ||
          user.clientId === employee.client?.id;
        if (!isClientEmp) {
          return NextResponse.json({ error: 'Permission denied. Not enrolled in your client organization.' }, { status: 403 });
        }
      } else if (user.role === 'EMPLOYEE') {
        const isSelf = employee.id === user.employeeProfileId || employee.employeeId === user.employeeId;
        if (!isSelf && employee.reportingManagerId !== user.employeeProfileId) {
          return NextResponse.json({ error: 'Permission denied. Self-access or subordinate access only.' }, { status: 403 });
        }
      }
    }

    // Fetch related lifecycle events
    const lifecycleEvents = await getLifecycleEvents(employee.employeeId);

    // Fetch audit history for this employee
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: employee.employeeId },
          { actorEmployeeId: employee.employeeId },
          ...(employee.userId ? [{ actorUserId: employee.userId }] : []),
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    // Fetch monthly timesheet calculations
    const currentMonth = new Date().toISOString().substring(0, 7);
    const timesheetData = await calculateTimesheets({
      periodType: 'MONTHLY',
      periodIdentifier: currentMonth,
      employeeId: employee.id,
    });

    // Calculate attendance summary statistics
    const totalPunches = employee.attendanceRecords.length;
    const presentCount = employee.attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
    const lateCount = employee.attendanceRecords.filter((a) => a.isLate).length;
    const totalWorkedMinutes = employee.attendanceRecords.reduce((acc, cur) => acc + (cur.totalWorkMinutes || 0), 0);
    const totalOvertimeMinutes = employee.attendanceRecords.reduce((acc, cur) => acc + (cur.overtimeMinutes || 0), 0);

    // Leave balance calculation
    const approvedLeaves = employee.leaveRequests.filter((l) => l.status === 'APPROVED');
    const casualUsed = approvedLeaves.filter((l) => l.leaveType === 'CASUAL' || l.leaveType === 'CL').reduce((a, c) => a + c.totalDays, 0);
    const sickUsed = approvedLeaves.filter((l) => l.leaveType === 'SICK' || l.leaveType === 'SL').reduce((a, c) => a + c.totalDays, 0);
    const earnedUsed = approvedLeaves.filter((l) => l.leaveType === 'EARNED' || l.leaveType === 'EL').reduce((a, c) => a + c.totalDays, 0);

    const leaveBalances = {
      casual: { allocated: 12, used: casualUsed, remaining: Math.max(0, 12 - casualUsed) },
      sick: { allocated: 10, used: sickUsed, remaining: Math.max(0, 10 - sickUsed) },
      earned: { allocated: 15, used: earnedUsed, remaining: Math.max(0, 15 - earnedUsed) },
    };

    // Client assignment history
    const clientHistory = await prisma.clientAssignment.findMany({
      where: { toEmployeeId: employee.id },
      include: {
        client: { select: { id: true, clientId: true, companyName: true } },
        assignedBy: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { assignedAt: 'desc' },
      take: 10,
    });

    // Sanitized PII & masked documents
    const sanitizedPAN = employee.panNumber ? maskPAN(employee.panNumber) : null;
    const sanitizedAadhaar = employee.aadhaarMasked || (employee as any).aadharNumber || null;

    const payload = {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        fatherMotherName: employee.fatherMotherName,
        dob: employee.dob,
        gender: employee.gender,
        phone: employee.phone,
        personalEmail: employee.personalEmail || employee.user?.email,
        address: employee.address,
        profilePhotoUrl: employee.profilePhotoUrl,
        emergencyContact: employee.emergencyContact,
        emergencyName: employee.emergencyName,
        department: employee.departmentName || employee.department?.name || 'General Operations',
        designation: employee.designation,
        location: employee.location || employee.jobLocation || 'Headquarters',
        employmentType: employee.employmentType,
        joiningDate: employee.joiningDate,
        probationEndDate: employee.probationEndDate,
        shiftStartTime: employee.shiftStartTime,
        shiftEndTime: employee.shiftEndTime,
        status: employee.status,
        isBlocked: employee.isBlocked,
        blockedReason: employee.blockedReason,
        accountStatus: employee.user?.isSuspended ? 'SUSPENDED' : employee.isBlocked ? 'BLOCKED' : employee.user?.isActive === false ? 'DEACTIVATED' : 'ACTIVE',
        client: employee.client ? {
          id: employee.client.id,
          clientId: employee.client.clientId,
          companyName: employee.client.companyName,
          status: employee.client.status,
        } : null,
        reportingManager: employee.reportingManager,
        subordinates: employee.subordinates,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
      attendanceSummary: {
        totalRecords: totalPunches,
        presentDays: presentCount,
        lateDays: lateCount,
        avgDailyHours: presentCount > 0 ? parseFloat((totalWorkedMinutes / (presentCount * 60)).toFixed(1)) : 0,
        totalOvertimeHours: parseFloat((totalOvertimeMinutes / 60).toFixed(1)),
        records: employee.attendanceRecords,
      },
      timesheets: timesheetData,
      leaveBalances,
      leaveRequests: employee.leaveRequests,
      tasks: employee.assignedCrmTasks,
      documents: employee.documents,
      kyc: {
        panMasked: sanitizedPAN,
        aadhaarMasked: sanitizedAadhaar,
        verificationStatus: employee.documents.some((d) => d.documentType === 'PAN' && d.verificationStatus === 'VERIFIED') ? 'VERIFIED' : 'PENDING_VERIFICATION',
      },
      account: {
        userId: employee.userId,
        email: employee.user?.email,
        role: employee.user?.role?.displayName || employee.user?.role?.name || 'Employee',
        isActive: employee.user?.isActive,
        isSuspended: employee.user?.isSuspended,
        lastLoginAt: employee.user?.lastLoginAt,
        activeSessions: employee.user?.sessions || [],
        isDelegated: employee.user?.isDelegated,
      },
      clientAssignment: {
        current: employee.client,
        history: clientHistory,
      },
      timeline: lifecycleEvents,
      auditHistory: auditLogs,
    };

    return NextResponse.json({ success: true, ...payload });
  } catch (err: any) {
    console.error('Error fetching Employee 360 data:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
