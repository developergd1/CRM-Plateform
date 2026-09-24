import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { notifyLeaveReviewed } from '@/lib/notifications';

// Helper to generate all dates between startDate and endDate (YYYY-MM-DD)
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  try {
    const curr = new Date(startStr);
    const end = new Date(endStr);
    // Sanity limit to 60 days
    let iterations = 0;
    while (curr <= end && iterations < 60) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      iterations++;
    }
  } catch (e) {
    console.error('Date range parse error:', e);
  }
  return dates.length > 0 ? dates : [startStr];
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const { status, reviewRemarks, rejectionReason } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status (APPROVED or REJECTED) is required' }, { status: 400 });
    }

    // Mandatory rejection reason validation
    if (status === 'REJECTED') {
      const reason = (rejectionReason || reviewRemarks || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection Reason is mandatory when rejecting a leave request.' },
          { status: 400 }
        );
      }
    }

    // Fetch existing leave request with employee details
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            clientId: true,
          },
        },
      },
    });

    if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

    // Authorization check: Admin / HR / Manager OR Authorized Client of this employee
    let reviewerName = user.companyName || user.fullName || 'Authorized Reviewer';

    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      if (!clientProfile || leave.employee.clientId !== clientProfile.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only approve/reject leave for your own company employees.' },
          { status: 403 }
        );
      }
      reviewerName = clientProfile.companyName || user.fullName || 'Client Authority';
    } else if (!isManagerOrAbove(user.role)) {
      return NextResponse.json(
        { error: 'Permission denied. Only authorized Clients, HR, or Admins can review leave.' },
        { status: 403 }
      );
    }

    const effectiveReason = status === 'REJECTED' ? (rejectionReason || reviewRemarks)?.trim() : null;
    const previousStatus = leave.status;

    // 1. Update Leave Request
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: user.employeeId || user.id,
        reviewedAt: new Date(),
        reviewRemarks: reviewRemarks?.trim() || null,
        rejectionReason: effectiveReason,
      },
    });

    // 2. Attendance Integration (Requirement 9)
    // If APPROVED, integrate with Attendance table: mark each date in range as 'ON_LEAVE'
    if (status === 'APPROVED') {
      const leaveDates = getDatesInRange(leave.startDate, leave.endDate);

      for (const dateStr of leaveDates) {
        // Upsert attendance record for that date
        const existingAttendance = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: leave.employeeId,
              date: dateStr,
            },
          },
        });

        // Only override status if employee has not already clocked physical working hours
        if (!existingAttendance || !existingAttendance.checkInTime) {
          await prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: leave.employeeId,
                date: dateStr,
              },
            },
            update: {
              status: 'ON_LEAVE',
              remarks: `Approved Leave: ${leave.leaveType} (${leave.reason})`,
            },
            create: {
              employeeId: leave.employeeId,
              date: dateStr,
              status: 'ON_LEAVE',
              remarks: `Approved Leave: ${leave.leaveType} (${leave.reason})`,
            },
          });
        }
      }
    }

    // 3. Record Immutable Leave Action History (Requirement 10)
    await prisma.leaveActionHistory.create({
      data: {
        leaveId: leave.id,
        action: status,
        performedBy: reviewerName,
        performerRole: user.role,
        performerId: user.employeeId || user.id,
        previousStatus,
        newStatus: status,
        rejectionReason: effectiveReason,
        remarks: reviewRemarks?.trim() || null,
      },
    });

    // 4. Audit Log
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: status === 'APPROVED' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      previousData: { status: previousStatus },
      newData: { status, reviewedBy: reviewerName, rejectionReason: effectiveReason },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    // 5. In-app Notification to Employee
    await notifyLeaveReviewed({
      leaveId: leave.id,
      status,
      reviewerName,
      employeeId: leave.employeeId,
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error: any) {
    console.error('Leave review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
