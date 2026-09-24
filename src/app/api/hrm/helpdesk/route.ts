import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getHelpdeskTickets,
  createHelpdeskTicket,
  addHelpdeskComment,
  updateHelpdeskStatus,
} from '@/services/hrm/experience.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId;

    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status') as any;

    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (employeeId && employeeId !== ownEmpId && employeeId !== user.employeeProfile?.id && employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own helpdesk tickets.' }, { status: 403 });
      }
      employeeId = ownEmpId || null;
    }

    const tickets = await getHelpdeskTickets({
      employeeId: employeeId || undefined,
      status: status || undefined,
      tenantClientId: targetClientId,
    });

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body.type === 'COMMENT') {
      if (!body.ticketId || !body.comment) {
        return NextResponse.json({ error: 'Missing ticketId or comment' }, { status: 400 });
      }

      const comment = await addHelpdeskComment(
        body.ticketId,
        body.comment,
        {
          id: user.id,
          fullName: user.fullName || 'User',
          role: user.role,
        }
      );

      return NextResponse.json({ success: true, comment });
    }

    if (body.type === 'STATUS_UPDATE') {
      if (user.role === 'EMPLOYEE') {
        return NextResponse.json({ error: 'Permission denied. Employees cannot change ticket status.' }, { status: 403 });
      }

      if (!body.ticketId || !body.status) {
        return NextResponse.json({ error: 'Missing ticketId or status' }, { status: 400 });
      }

      const ticket = await updateHelpdeskStatus(
        body.ticketId,
        body.status,
        {
          id: user.id,
          fullName: user.fullName || 'Staff',
        }
      );

      return NextResponse.json({ success: true, ticket });
    }

    // Default: Create Ticket
    let targetEmployeeId = body.employeeId || user.employeeProfile?.id || user.employeeId;
    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (body.employeeId && body.employeeId !== ownEmpId && body.employeeId !== user.employeeProfile?.id && body.employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You cannot create tickets for another employee.' }, { status: 403 });
      }
      targetEmployeeId = ownEmpId;
    }

    if (!targetEmployeeId || !body.subject || !body.description) {
      return NextResponse.json({ error: 'Missing employeeId, subject, or description' }, { status: 400 });
    }

    const ticket = await createHelpdeskTicket(
      {
        employeeId: targetEmployeeId,
        category: body.category || 'GENERAL',
        subject: body.subject,
        description: body.description,
        priority: body.priority || 'MEDIUM',
      },
      {
        id: user.id,
        fullName: user.fullName || 'Employee',
      }
    );

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
