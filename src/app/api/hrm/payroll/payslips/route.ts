import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdmin, isAdminOrHR } from '@/lib/rbac';
import { getPayslips } from '@/services/hrm/payroll.service';
import { getTenantContext, checkModuleAccess } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const requestedEmpId = searchParams.get('employeeId') || undefined;
    const periodCode = searchParams.get('periodCode') || undefined;

    let targetEmpId = requestedEmpId;

    if (!isAdminOrHR(user.role)) {
      const ownEmpObjectId = user.employeeProfile?.id;
      const ownEmpCode = user.employeeProfile?.employeeId || user.employeeId;
      
      // If requesting a specific employee, strictly deny cross-employee BOLA/IDOR queries
      if (requestedEmpId) {
        const isSelf = requestedEmpId === ownEmpObjectId || requestedEmpId === ownEmpCode;
        if (!isSelf) {
          return NextResponse.json(
            { error: 'Forbidden: You can only view your own payslips.' },
            { status: 403 }
          );
        }
      }

      targetEmpId = ownEmpObjectId || ownEmpCode;
      if (!targetEmpId) {
        return NextResponse.json({ success: true, payslips: [] });
      }
    }

    const payslips = await getPayslips({
      employeeId: targetEmpId,
      periodCode,
      tenantClientId: tenantContext?.clientDocId,
    });

    return NextResponse.json({
      success: true,
      payslips,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
