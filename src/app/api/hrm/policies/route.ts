import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getHrPolicies,
  createHrPolicy,
  acknowledgeHrPolicy,
} from '@/services/hrm/experience.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await getHrPolicies();
    return NextResponse.json({ success: true, policies });
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

    if (body.type === 'ACKNOWLEDGE') {
      const empId = body.employeeId || user.employeeProfile?.id || user.employeeId;
      if (!body.policyId || !empId) {
        return NextResponse.json({ error: 'Missing policyId or employeeId' }, { status: 400 });
      }

      const ack = await acknowledgeHrPolicy(body.policyId, empId, {
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });

      return NextResponse.json({ success: true, acknowledgment: ack });
    }

    // Default: Create Policy
    if (!body.title || !body.category || !body.content) {
      return NextResponse.json({ error: 'Missing title, category, or content' }, { status: 400 });
    }

    const policy = await createHrPolicy(
      {
        title: body.title,
        category: body.category,
        content: body.content,
        fileUrl: body.documentUrl || body.fileUrl,
        requiresAck: body.requiresAcknowledgment,
        effectiveDate: body.effectiveDate,
      } as any,
      {
        id: user.id,
        fullName: user.fullName || 'Compliance Officer',
      }
    );

    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
