import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { generateClientId, generateActivityNumber } from '@/lib/id-generator';
import bcrypt from 'bcryptjs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      existingClientId,
      confirmCreateNew = false,
      companyName: customCompany,
      contactPerson: customContact,
      email: customEmail,
      mobile: customMobile,
      address: customAddress,
      industry: customIndustry,
      customPassword,
    } = body;

    const deal = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
      include: {
        client: true,
        lead: true,
        primaryContact: true,
        opportunity: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // 1. Idempotency Check
    if (deal.isConvertedToClient && deal.convertedToClientId) {
      const existingConvertedClient = await prisma.client.findUnique({
        where: { id: deal.convertedToClientId },
      });
      if (existingConvertedClient) {
        return NextResponse.json({
          success: true,
          alreadyConverted: true,
          message: 'Deal has already been converted to client.',
          client: existingConvertedClient,
        });
      }
    }

    // Resolve target values from deal / lead / contact or overrides
    const targetCompany = (
      customCompany ||
      deal.lead?.companyName ||
      deal.title.replace(/^Deal:\s*/i, '') ||
      'Corporate Client'
    ).trim();

    const targetContact = (
      customContact ||
      deal.primaryContact?.fullName ||
      deal.lead?.contactPerson ||
      deal.lead?.fullName ||
      'Authorized Representative'
    ).trim();

    const targetEmail = (
      customEmail ||
      deal.primaryContact?.email ||
      deal.lead?.email ||
      ''
    ).trim().toLowerCase();

    const targetMobile = (
      customMobile ||
      deal.primaryContact?.phone ||
      deal.lead?.phone ||
      ''
    ).trim();

    const targetIndustry = (
      customIndustry ||
      deal.lead?.industry ||
      'Services'
    ).trim();

    const targetAddress = (
      customAddress ||
      deal.lead?.location ||
      deal.lead?.city ||
      null
    );

    // 2. Existing Client Deduplication & Match Check
    let matchedClient: any = null;

    if (existingClientId) {
      // User explicitly picked an existing client
      matchedClient = await prisma.client.findFirst({
        where: getClientLookup(existingClientId),
      });
      if (!matchedClient) {
        return NextResponse.json({ error: 'Specified existing client not found.' }, { status: 404 });
      }
    } else if (!confirmCreateNew) {
      // Search for duplicates
      const conditions: any[] = [];
      if (targetCompany) {
        conditions.push({ companyName: { equals: targetCompany, mode: 'insensitive' } });
      }
      if (targetEmail) {
        conditions.push({ email: { equals: targetEmail, mode: 'insensitive' } });
      }
      if (targetMobile && targetMobile.length >= 7) {
        conditions.push({ mobile: { equals: targetMobile } });
      }

      if (conditions.length > 0) {
        const potentialMatch = await prisma.client.findFirst({
          where: { OR: conditions },
        });

        if (potentialMatch) {
          return NextResponse.json({
            success: false,
            duplicateFound: true,
            message: `A client with matching company name or contact details (${potentialMatch.companyName} - ${potentialMatch.clientId}) already exists.`,
            candidate: {
              id: potentialMatch.id,
              clientId: potentialMatch.clientId,
              companyName: potentialMatch.companyName,
              contactPerson: potentialMatch.contactPerson,
              email: potentialMatch.email,
              mobile: potentialMatch.mobile,
            },
          }, { status: 409 });
        }
      }
    }

    // 3. Flow A: Link to Existing Client
    if (matchedClient) {
      const now = new Date();

      await prisma.$transaction([
        prisma.deal.update({
          where: { id: deal.id },
          data: {
            clientId: matchedClient.id,
            isConvertedToClient: true,
            convertedToClientId: matchedClient.id,
            stage: 'WON',
            status: 'WON',
            closedAt: deal.closedAt || now,
          },
        }),
        ...(deal.leadId
          ? [
              prisma.lead.update({
                where: { id: deal.leadId },
                data: {
                  clientId: matchedClient.id,
                  status: 'CONVERTED',
                  convertedAt: now,
                },
              }),
            ]
          : []),
        ...(deal.primaryContactId
          ? [
              prisma.contact.update({
                where: { id: deal.primaryContactId },
                data: {
                  clientId: matchedClient.id,
                },
              }),
            ]
          : []),
        ...(deal.opportunityId
          ? [
              prisma.opportunity.update({
                where: { id: deal.opportunityId },
                data: {
                  clientId: matchedClient.id,
                  stage: 'CLOSED_WON',
                  closedAt: now,
                },
              }),
            ]
          : []),
      ]);

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'SYSTEM',
        action: 'CLIENT_CONVERSION_COMPLETED',
        entityType: 'DEAL',
        entityId: deal.dealNumber,
        newData: {
          isNewClient: false,
          clientId: matchedClient.clientId,
          companyName: matchedClient.companyName,
        },
        reason: 'Deal WON linked to existing client record',
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        isNewClient: false,
        message: `Deal ${deal.dealNumber} linked to existing client ${matchedClient.companyName} (${matchedClient.clientId}).`,
        client: matchedClient,
      });
    }

    // 4. Flow B: Create Brand New Client Record + Client User Account
    const newClientId = await generateClientId(targetCompany);
    const clientNumMatch = newClientId.replace(/\D/g, '');
    const clientEmail = targetEmail || `client.${clientNumMatch}@growthindia.in`;
    const clientMobile = targetMobile || '0000000000';

    // Password generation
    const generatedPassword = customPassword || `Client#${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Ensure CLIENT role exists
    let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
    if (!clientRole) {
      clientRole = await prisma.role.create({
        data: {
          name: 'CLIENT',
          displayName: 'Client Account',
          description: 'Client corporate portal access',
          isSystem: true,
        },
      });
    }

    // Get or create User
    let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });
    if (!clientUser) {
      clientUser = await prisma.user.create({
        data: {
          email: clientEmail,
          passwordHash: hashedPassword,
          roleId: clientRole.id,
          isActive: true,
        },
      });
    }

    // Create Client profile
    const newClient = await prisma.client.create({
      data: {
        clientId: newClientId,
        companyName: targetCompany,
        contactPerson: targetContact,
        mobile: clientMobile,
        email: clientEmail,
        address: targetAddress,
        industry: targetIndustry,
        status: 'ACTIVE',
        dateAdded: new Date(),
        userId: clientUser.id,
        canBlockEmployees: false,
        canDeleteEmployees: false,
        estimatedValue: deal.amount || 0,
        stage: 'ACTIVE',
        assignedEmployeeId: deal.assignedToId || null,
        createdById: user.employeeId || null,
      },
    });

    const now = new Date();
    const activityNumber = await generateActivityNumber();

    // Link Deal, Lead, Contact, Opportunity
    await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          clientId: newClient.id,
          isConvertedToClient: true,
          convertedToClientId: newClient.id,
          stage: 'WON',
          status: 'WON',
          closedAt: deal.closedAt || now,
        },
      }),
      ...(deal.leadId
        ? [
            prisma.lead.update({
              where: { id: deal.leadId },
              data: {
                clientId: newClient.id,
                status: 'CONVERTED',
                convertedAt: now,
              },
            }),
          ]
        : []),
      ...(deal.primaryContactId
        ? [
            prisma.contact.update({
              where: { id: deal.primaryContactId },
              data: {
                clientId: newClient.id,
              },
            }),
          ]
        : []),
      ...(deal.opportunityId
        ? [
            prisma.opportunity.update({
              where: { id: deal.opportunityId },
              data: {
                clientId: newClient.id,
                stage: 'CLOSED_WON',
                closedAt: now,
              },
            }),
          ]
        : []),
      prisma.activity.create({
        data: {
          activityNumber,
          type: 'OTHER',
          status: 'COMPLETED',
          subject: `Deal Won & Converted: Client ${newClient.clientId} Created`,
          description: `Client ${newClient.companyName} created from Deal ${deal.dealNumber}. Linked to workforce & client management.`,
          completedAt: now,
          dealId: deal.id,
          clientId: newClient.id,
          performedById: deal.assignedToId || null,
        },
      }),
    ]);

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CLIENT_CONVERSION_COMPLETED',
      entityType: 'CLIENT',
      entityId: newClient.clientId,
      newData: {
        dealNumber: deal.dealNumber,
        clientId: newClient.clientId,
        companyName: newClient.companyName,
        email: newClient.email,
        mobile: newClient.mobile,
      },
      reason: `Converted from Deal ${deal.dealNumber}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      isNewClient: true,
      message: `Client ${newClient.companyName} (${newClient.clientId}) successfully created and linked to workforce management!`,
      client: newClient,
      credentials: {
        email: clientEmail,
        temporaryPassword: generatedPassword,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error converting deal to client:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert deal to client' }, { status: 500 });
  }
}
