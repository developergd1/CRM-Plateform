import { prisma, isValidObjectId } from './prisma';
import { logAuditEvent } from './audit';
import { getEffectiveWorkPolicy } from './work-policy';

export interface RegularizationRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  employeeDisplayId?: string;
  clientId?: string;
  clientName?: string;
  date: string; // YYYY-MM-DD
  requestedCheckIn: string; // HH:MM or ISO string
  requestedCheckOut: string; // HH:MM or ISO string
  reasonType?: string;
  reason: string;
  supportingReason?: string;
  remarks?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
}

const REGULARIZATIONS_KEY = 'ATTENDANCE_REGULARIZATIONS';

export async function getRegularizationRequests(filter?: {
  employeeId?: string;
  clientId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}): Promise<RegularizationRequestItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REGULARIZATIONS_KEY },
    });
    if (!setting?.value) return [];
    let list: RegularizationRequestItem[] = JSON.parse(setting.value);

    if (filter?.employeeId) {
      list = list.filter(
        (r) =>
          r.employeeId === filter.employeeId ||
          r.employeeCode === filter.employeeId ||
          r.employeeDisplayId === filter.employeeId
      );
    }
    if (filter?.clientId) {
      list = list.filter((r) => r.clientId === filter.clientId);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error('Error fetching regularization requests:', e);
    return [];
  }
}

export async function submitRegularizationRequest(data: {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  employeeDisplayId?: string;
  clientId?: string;
  clientName?: string;
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason?: string;
  reasonType?: string;
  supportingReason?: string;
  remarks?: string;
}) {
  const policy = await getEffectiveWorkPolicy({ employeeId: data.employeeId, clientId: data.clientId });

  // Verify date within window
  const reqDate = new Date(data.date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > policy.regularizationWindowDays) {
    throw new Error(`Regularization window exceeded. Corrections must be submitted within ${policy.regularizationWindowDays} days.`);
  }

  const existing = await getRegularizationRequests();
  const displayId = data.employeeDisplayId || data.employeeCode;
  const duplicate = existing.find(
    (r) =>
      (r.employeeId === data.employeeId || (displayId && r.employeeDisplayId === displayId)) &&
      r.date === data.date &&
      r.status === 'PENDING'
  );
  if (duplicate) {
    throw new Error('A pending regularization request already exists for this date.');
  }

  const newItem: RegularizationRequestItem = {
    id: `REG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    employeeDisplayId: data.employeeDisplayId || data.employeeCode || '',
    employeeCode: data.employeeCode || data.employeeDisplayId || '',
    reason: data.reason || data.reasonType || 'MISSED_PUNCH',
    reasonType: data.reasonType || data.reason || 'MISSED_PUNCH',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  existing.unshift(newItem);

  await prisma.systemSetting.upsert({
    where: { key: REGULARIZATIONS_KEY },
    update: { value: JSON.stringify(existing), updatedAt: new Date() },
    create: {
      key: REGULARIZATIONS_KEY,
      value: JSON.stringify(existing),
      category: 'ATTENDANCE',
      description: 'Employee Attendance Regularization Requests',
    },
  });

  // Notify Client & Admin
  try {
    const { notifyRegularizationRequested } = await import('./notifications');
    await notifyRegularizationRequested({
      reqId: newItem.id,
      employeeName: data.employeeName,
      employeeId: data.employeeId,
      date: data.date,
      clientId: data.clientId,
    });
  } catch (e) {
    console.error('Failed to send regularization request notification:', e);
  }

  return newItem;
}

export const createRegularizationRequest = submitRegularizationRequest;

export async function reviewRegularizationRequest(
  arg1: string | { requestId: string; action: 'APPROVED' | 'REJECTED' | 'APPROVE' | 'REJECT'; reviewedByUserId?: string; reviewerName?: string; remarks?: string },
  arg2?: 'APPROVE' | 'REJECT' | 'APPROVED' | 'REJECTED',
  arg3?: { id: string; name: string; role?: string; employeeId?: string },
  arg4?: string,
  arg5?: string
) {
  let requestId: string;
  let actionStr: string;
  let reviewerName: string = 'Supervisor';
  let reviewerId: string = 'SYSTEM';
  let reviewRemarks: string = '';
  let ipAddress: string = '127.0.0.1';

  if (typeof arg1 === 'object') {
    requestId = arg1.requestId;
    actionStr = arg1.action;
    reviewerName = arg1.reviewerName || 'Supervisor';
    reviewerId = arg1.reviewedByUserId || 'SYSTEM';
    reviewRemarks = arg1.remarks || '';
  } else {
    requestId = arg1;
    actionStr = arg2!;
    reviewerName = arg3?.name || 'Supervisor';
    reviewerId = arg3?.id || 'SYSTEM';
    reviewRemarks = arg4 || '';
    ipAddress = arg5 || '127.0.0.1';
  }

  const normalizedAction = actionStr.startsWith('APPROV') ? 'APPROVED' : 'REJECTED';

  const existing = await getRegularizationRequests();
  const index = existing.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error('Request not found');

  const req = existing[index];
  if (req.status !== 'PENDING') throw new Error(`Request has already been ${req.status}`);

  req.status = normalizedAction;
  req.reviewedBy = reviewerName;
  req.reviewedAt = new Date().toISOString();
  req.reviewRemarks = reviewRemarks;

  // If approved, update actual Attendance record in database!
  if (normalizedAction === 'APPROVED') {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(isValidObjectId(req.employeeId) ? [{ id: req.employeeId }] : []),
          { employeeId: req.employeeDisplayId || req.employeeCode || req.employeeId || '' },
        ],
      },
    });

    if (employee) {
      // Parse dates cleanly
      let checkInTime: Date;
      let checkOutTime: Date;

      if (req.requestedCheckIn.includes('T') || req.requestedCheckIn.includes(':')) {
        if (req.requestedCheckIn.includes('T')) {
          checkInTime = new Date(req.requestedCheckIn);
        } else {
          const [h, m] = req.requestedCheckIn.split(':').map(Number);
          checkInTime = new Date(req.date);
          checkInTime.setHours(h, m, 0, 0);
        }
      } else {
        checkInTime = new Date(`${req.date}T09:30:00.000Z`);
      }

      if (req.requestedCheckOut.includes('T') || req.requestedCheckOut.includes(':')) {
        if (req.requestedCheckOut.includes('T')) {
          checkOutTime = new Date(req.requestedCheckOut);
        } else {
          const [h, m] = req.requestedCheckOut.split(':').map(Number);
          checkOutTime = new Date(req.date);
          checkOutTime.setHours(h, m, 0, 0);
        }
      } else {
        checkOutTime = new Date(`${req.date}T18:30:00.000Z`);
      }

      const netMinutes = Math.max(0, Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000) - 60);

      const oldAttendance = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: req.date,
          },
        },
      });

      const updated = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: req.date,
          },
        },
        update: {
          checkInTime,
          checkOutTime,
          status: 'PRESENT',
          totalWorkMinutes: netMinutes,
          remarks: `Regularized by ${reviewerName} (${req.reason})`,
        },
        create: {
          employeeId: employee.id,
          date: req.date,
          checkInTime,
          checkOutTime,
          status: 'PRESENT',
          totalWorkMinutes: netMinutes,
          remarks: `Regularized by ${reviewerName} (${req.reason})`,
        },
      });

      await logAuditEvent({
        actorUserId: reviewerId,
        actorEmployeeId: 'SYSTEM',
        action: 'ATTENDANCE_REGULARIZATION_APPROVED',
        entityType: 'ATTENDANCE',
        entityId: updated.id,
        previousData: oldAttendance ? JSON.stringify(oldAttendance) : undefined,
        newData: JSON.stringify({
          checkInTime,
          checkOutTime,
          status: updated.status,
          regularizedBy: req.reviewedBy,
        }),
        reason: `Regularization approval: ${req.reason} - ${req.supportingReason || ''}`,
        ipAddress,
        status: 'SUCCESS',
      });
    }
  }

  // Save updated list
  await prisma.systemSetting.update({
    where: { key: REGULARIZATIONS_KEY },
    data: { value: JSON.stringify(existing), updatedAt: new Date() },
  });

  // Notify Employee about decision
  try {
    const { notifyRegularizationReviewed } = await import('./notifications');
    await notifyRegularizationReviewed({
      reqId: req.id,
      status: normalizedAction as any,
      reviewerName,
      employeeId: req.employeeId,
      date: req.date,
    });
  } catch (e) {
    console.error('Failed to send regularization review notification:', e);
  }

  return req;
}
