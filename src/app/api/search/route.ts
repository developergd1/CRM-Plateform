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
          leads: [],
          contacts: [],
          opportunities: [],
          deals: [],
        },
      });
    }

    const tenantWhere = await buildTenantWhereClause(user);

    // Run parallel queries across models
    const [clients, employees, leads, contacts, opportunities, deals] = await Promise.all([
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

      // Leads
      prisma.lead.findMany({
        where: {
          ...tenantWhere,
          isArchived: false,
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { contactPerson: { contains: q, mode: 'insensitive' } },
            { leadNumber: { contains: q, mode: 'insensitive' } },
            { companyName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          leadNumber: true,
          fullName: true,
          contactPerson: true,
          companyName: true,
          status: true,
          phone: true,
          city: true,
          estimatedValue: true,
        },
      }),

      // Contacts
      prisma.contact.findMany({
        where: {
          ...tenantWhere,
          isArchived: false,
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { contactNumber: { contains: q, mode: 'insensitive' } },
            { designation: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { alternatePhone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          contactNumber: true,
          fullName: true,
          designation: true,
          department: true,
          phone: true,
          isDecisionMaker: true,
          client: {
            select: { companyName: true },
          },
          lead: {
            select: { leadNumber: true, fullName: true },
          },
        },
      }),

      // Opportunities (Internal CRM only - never exposed to CLIENT role)
      user.role === 'CLIENT'
        ? Promise.resolve([])
        : prisma.opportunity.findMany({
            where: {
              ...tenantWhere,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { opportunityNumber: { contains: q, mode: 'insensitive' } },
                { productService: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: {
              id: true,
              opportunityNumber: true,
              title: true,
              stage: true,
              value: true,
              probability: true,
              client: {
                select: { companyName: true },
              },
              lead: {
                select: { companyName: true },
              },
            },
          }),

      // Deals (Internal CRM only - never exposed to CLIENT role)
      user.role === 'CLIENT'
        ? Promise.resolve([])
        : prisma.deal.findMany({
            where: {
              ...tenantWhere,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { dealNumber: { contains: q, mode: 'insensitive' } },
                { productService: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: {
              id: true,
              dealNumber: true,
              title: true,
              amount: true,
              stage: true,
              status: true,
              probability: true,
              weightedValue: true,
              client: {
                select: { companyName: true },
              },
              lead: {
                select: { companyName: true },
              },
            },
          }),
    ]);

    const totalMatches =
      clients.length +
      employees.length +
      leads.length +
      contacts.length +
      opportunities.length +
      deals.length;

    return NextResponse.json({
      query: q,
      totalMatches,
      results: {
        clients,
        employees,
        leads,
        contacts,
        opportunities,
        deals,
      },
    });
  } catch (error: any) {
    console.error('Unified search API error:', error);
    return NextResponse.json({ error: 'Failed to execute search' }, { status: 500 });
  }
}
