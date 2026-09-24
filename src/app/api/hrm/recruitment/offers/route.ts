import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createJobOffer, updateOfferStatus } from '@/services/hrm/recruitment.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body.type === 'STATUS_UPDATE') {
      const offer = await updateOfferStatus(
        body.offerId,
        body.status,
        {
          id: user.id,
          fullName: user.fullName || 'HR Manager',
        }
      );
      return NextResponse.json({ success: true, offer });
    }

    // Default: Create Offer
    if (!body.candidateId || !body.designation || !body.offeredCtc || !body.joiningDate) {
      return NextResponse.json(
        { error: 'Missing candidateId, designation, offeredCtc, or joiningDate' },
        { status: 400 }
      );
    }

    const offer = await createJobOffer(
      {
        candidateId: body.candidateId,
        designation: body.designation,
        departmentId: body.departmentId,
        offeredCtc: Number(body.offeredCtc),
        joiningDate: body.joiningDate,
        expiryDate: body.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        offerLetterUrl: body.offerLetterUrl,
        notes: body.notes,
      } as any,
      {
        id: user.id,
        fullName: user.fullName || 'HR Manager',
      }
    );

    return NextResponse.json({ success: true, offer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
