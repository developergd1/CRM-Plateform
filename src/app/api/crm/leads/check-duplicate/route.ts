import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone, email, companyName, contactPerson, fullName, excludeId } = body;

    const trimmedPhone = phone?.trim();
    const trimmedEmail = email?.trim()?.toLowerCase();
    const nameToCheck = (contactPerson || fullName)?.trim();
    const trimmedCompany = companyName?.trim();

    if (!trimmedPhone && !trimmedEmail && !nameToCheck && !trimmedCompany) {
      return NextResponse.json({ isDuplicate: false, duplicates: [] });
    }

    // Build matching criteria
    const matchConditions: any[] = [];

    // Exact phone match
    if (trimmedPhone) {
      matchConditions.push({ phone: trimmedPhone });
      matchConditions.push({ alternatePhone: trimmedPhone });
    }

    // Exact email match
    if (trimmedEmail) {
      matchConditions.push({ email: { equals: trimmedEmail, mode: 'insensitive' } });
    }

    // Company + Name match
    if (trimmedCompany && nameToCheck) {
      matchConditions.push({
        AND: [
          { companyName: { equals: trimmedCompany, mode: 'insensitive' } },
          {
            OR: [
              { fullName: { equals: nameToCheck, mode: 'insensitive' } },
              { contactPerson: { equals: nameToCheck, mode: 'insensitive' } },
            ],
          },
        ],
      });
    }

    if (matchConditions.length === 0) {
      return NextResponse.json({ isDuplicate: false, duplicates: [] });
    }

    const whereClause: any = {
      isArchived: false,
      OR: matchConditions,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    const foundLeads = await prisma.lead.findMany({
      where: whereClause,
      select: {
        id: true,
        leadNumber: true,
        fullName: true,
        contactPerson: true,
        companyName: true,
        phone: true,
        email: true,
        status: true,
        priority: true,
        assignedTo: {
          select: {
            employeeId: true,
            fullName: true,
          },
        },
        createdAt: true,
      },
      take: 10,
    });

    return NextResponse.json({
      isDuplicate: foundLeads.length > 0,
      count: foundLeads.length,
      duplicates: foundLeads,
    });
  } catch (error: any) {
    console.error('Error checking duplicate leads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check duplicate leads' },
      { status: 500 }
    );
  }
}
