import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientIdParam = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);

    const clientWhere: any = { status: 'ACTIVE' };
    if (clientIdParam && clientIdParam !== 'ALL') {
      const resolved = await prisma.client.findFirst({ where: getClientLookup(clientIdParam), select: { id: true } });
      if (resolved) clientWhere.id = resolved.id;
    }

    const [clients, departments, employees] = await Promise.all([
      prisma.client.findMany({
        where: clientWhere,
        select: { id: true, clientId: true, companyName: true, industry: true, contactPerson: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.department.findMany({
        include: { teams: true },
        orderBy: { name: 'asc' },
      }),
      prisma.employee.findMany({
        where: {
          employeeId: { not: 'GI-EMP-000001' },
          status: { not: 'ARCHIVED' },
          ...(clientWhere.id ? { clientId: clientWhere.id } : {}),
        },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
          departmentName: true,
          departmentId: true,
          clientId: true,
          reportingManagerId: true,
          status: true,
          phone: true,
          employmentType: true,
        },
      }),
    ]);

    // Build hierarchical tree structure
    const tree = clients.map((client) => {
      const clientEmployees = employees.filter((e) => e.clientId === client.id);

      // Group employees by department
      const departmentGroups: Record<string, any[]> = {};
      clientEmployees.forEach((emp) => {
        const deptKey = emp.departmentName || 'General Operations';
        if (!departmentGroups[deptKey]) departmentGroups[deptKey] = [];
        departmentGroups[deptKey].push(emp);
      });

      const depts = Object.entries(departmentGroups).map(([deptName, emps]) => {
        // Find managers and subordinates
        const managers = emps.filter((e) => !e.reportingManagerId || !emps.some((other) => other.id === e.reportingManagerId));
        return {
          name: deptName,
          totalHeadcount: emps.length,
          designations: Array.from(new Set(emps.map((e) => e.designation))),
          employees: emps,
          managerHierarchy: managers.map((mgr) => ({
            ...mgr,
            subordinates: emps.filter((sub) => sub.reportingManagerId === mgr.id),
          })),
        };
      });

      return {
        id: client.id,
        clientId: client.clientId,
        name: client.companyName,
        industry: client.industry || 'Enterprise Client',
        contactPerson: client.contactPerson,
        totalHeadcount: clientEmployees.length,
        departments: depts,
      };
    });

    // Also include internal Growth India staff if admin
    let internalOrg = null;
    if (user.role !== 'CLIENT') {
      const internalEmps = employees.filter((e) => !e.clientId);
      if (internalEmps.length > 0) {
        internalOrg = {
          id: 'INTERNAL',
          clientId: 'GI-INTERNAL',
          name: 'Growth India Internal Leadership & Core Team',
          industry: 'Workforce Platform Operations',
          contactPerson: 'Platform Administrator',
          totalHeadcount: internalEmps.length,
          departments: [
            {
              name: 'Executive & Platform Operations',
              totalHeadcount: internalEmps.length,
              designations: Array.from(new Set(internalEmps.map((e) => e.designation))),
              employees: internalEmps,
              managerHierarchy: internalEmps,
            },
          ],
        };
      }
    }

    return NextResponse.json({
      success: true,
      tree: internalOrg ? [internalOrg, ...tree] : tree,
      totalEmployees: employees.length,
      departmentsList: departments,
    });
  } catch (err: any) {
    console.error('Error fetching org structure:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
