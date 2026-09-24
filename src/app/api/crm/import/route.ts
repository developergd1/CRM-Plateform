import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canImportCRMData } from '@/lib/rbac';
import { generateLeadNumber, generateAccountNumber } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canImportCRMData(user.role)) return NextResponse.json({ error: 'Forbidden: Admin access required to import records.' }, { status: 403 });

    const { entity, rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: rows array required.' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    if (entity === 'leads') {
      for (const row of rows) {
        try {
          const name = row['Name'] || row['name'] || row['contactPerson'];
          const phone = row['Phone'] || row['phone'];
          if (!name || !phone) {
            skippedCount++;
            continue;
          }

          const leadNumber = await generateLeadNumber();
          await prisma.lead.create({
            data: {
              leadNumber,
              fullName: name.trim(),
              contactPerson: name.trim(),
              companyName: row['Company'] || row['company'] || null,
              phone: String(phone).trim(),
              email: row['Email'] || row['email'] || null,
              source: row['Source'] || 'IMPORT',
              status: row['Status'] || 'NEW',
              priority: row['Priority'] || 'MEDIUM',
            },
          });
          createdCount++;
        } catch (e: any) {
          errors.push(e.message);
          skippedCount++;
        }
      }
    } else if (entity === 'accounts') {
      for (const row of rows) {
        try {
          const companyName = row['Company Name'] || row['companyName'] || row['name'];
          const phone = row['Phone'] || row['phone'];
          if (!companyName || !phone) {
            skippedCount++;
            continue;
          }

          const accountCode = await generateAccountNumber();
          await prisma.account.create({
            data: {
              accountCode,
              companyName: companyName.trim(),
              phone: String(phone).trim(),
              email: row['Email'] || row['email'] || null,
              industry: row['Industry'] || row['industry'] || null,
              city: row['City'] || row['city'] || null,
              status: 'PROSPECT',
              accountType: 'COMMERCIAL',
            },
          });
          createdCount++;
        } catch (e: any) {
          errors.push(e.message);
          skippedCount++;
        }
      }
    } else {
      return NextResponse.json({ error: `Entity "${entity}" is not supported for import.` }, { status: 400 });
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'IMPORT_CRM_DATA',
      entityType: 'SYSTEM',
      entityId: `IMPORT-${entity.toUpperCase()}`,
      newData: { entity, createdCount, skippedCount, errorsCount: errors.length },
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      summary: {
        created: createdCount,
        skipped: skippedCount,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: error.message || 'Failed to import data' }, { status: 500 });
  }
}
