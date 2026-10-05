import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildTenantWhereClause } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({
        query: q,
        results: {
          clients: [],
          employees: [],
          tasks: [],
        },
      });
    }

    const tenantWhere = await buildTenantWhereClause(user);

    // Run parallel queries across models
    const [clients, employees, tasks] = await Promise.all([
      // Clients
      user.role === 'CLIENT'
        ? prisma.client.findMany({
            where: {
              ...tenantWhere,
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { clientId: { contains: q, mode: 'insensitive' } },
                { contactPerson: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: {
              id: true,
              clientId: true,
              companyName: true,
              contactPerson: true,
              mobile: true,
              status: true,
            },
          })
        : prisma.client.findMany({
            where: {
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { clientId: { contains: q, mode: 'insensitive' } },
                { contactPerson: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: {
              id: true,
              clientId: true,
              companyName: true,
              contactPerson: true,
              mobile: true,
              status: true,
            },
          }),

      // Employees
      prisma.employee.findMany({
        where: {
          ...tenantWhere,
          status: { not: 'BLOCKED' },
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { employeeId: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { designation: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
          phone: true,
          status: true,
          client: {
            select: {
              companyName: true,
            },
          },
        },
      }),

      // Tasks
      prisma.task.findMany({
        where: {
          ...tenantWhere,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { taskNumber: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          taskNumber: true,
          title: true,
          status: true,
          priority: true,
          client: {
            select: { companyName: true },
          },
          assignedTo: {
            select: { fullName: true, employeeId: true },
          },
        },
      }),
    ]);

    const totalMatches = clients.length + employees.length + tasks.length;

    return NextResponse.json({
      query: q,
      totalMatches,
      results: {
        clients,
        employees,
        tasks,
      },
    });
  } catch (error: any) {
    console.error('Unified search API error:', error);
    return NextResponse.json({ error: 'Failed to execute search' }, { status: 500 });
  }
}
