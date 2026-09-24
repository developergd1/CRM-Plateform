import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant';
import {
  getJobOpenings,
  getJobRequisitions,
  getCandidates,
  createJobOpening,
  createCandidate,
  updateCandidateStage,
  scheduleInterview,
  submitInterviewEvaluation,
  createJobOffer,
  updateOfferStatus,
  createJobRequisition,
} from '@/services/hrm/recruitment.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext(req);
    const requestedById = tenantContext?.clientDocId ? user.id : undefined;

    const { searchParams } = new URL(req.url);
    const openingId = searchParams.get('openingId') || searchParams.get('jobId') || undefined;
    const stage = searchParams.get('stage') as any;

    const [jobs, candidates, requisitions] = await Promise.all([
      getJobOpenings({ requestedById }),
      getCandidates({ jobOpeningId: openingId, stage, requestedById }),
      getJobRequisitions(requestedById),
    ]);

    return NextResponse.json({
      success: true,
      jobs,
      candidates,
      requisitions,
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

    if (body.type === 'CANDIDATE' || body.action === 'CREATE_CANDIDATE') {
      if (!body.jobOpeningId && !body.jobId) {
        return NextResponse.json({ error: 'Missing jobOpeningId' }, { status: 400 });
      }
      if (!body.fullName && !body.name) {
        return NextResponse.json({ error: 'Missing candidate name' }, { status: 400 });
      }

      const candidate = await createCandidate(
        {
          jobOpeningId: body.jobOpeningId || body.jobId,
          fullName: body.fullName || body.name,
          email: body.email,
          phone: body.phone,
          currentCompany: body.currentCompany,
          currentDesignation: body.currentDesignation,
          totalExperienceYears: Number(body.totalExperienceYears || body.experienceYears) || 0,
          currentCtc: body.currentCtc ? Number(body.currentCtc) : null,
          expectedCtc: body.expectedCtc ? Number(body.expectedCtc) : null,
          noticePeriodDays: body.noticePeriodDays ? Number(body.noticePeriodDays) : null,
          resumeUrl: body.resumeUrl,
          source: body.source || 'INTERNAL',
          notes: body.notes,
        } as any,
        {
          id: user.id,
          fullName: user.fullName || 'Recruiter',
        }
      );

      return NextResponse.json({
        success: true,
        candidate,
      });
    }

    if (body.type === 'STAGE_UPDATE' || body.type === 'UPDATE_STAGE') {
      if (!body.candidateId || !body.stage) {
        return NextResponse.json({ error: 'Missing candidateId or stage' }, { status: 400 });
      }

      const candidate = await updateCandidateStage(
        body.candidateId,
        body.stage,
        {
          id: user.id,
          fullName: user.fullName || 'Recruiter',
        }
      );

      return NextResponse.json({
        success: true,
        candidate,
      });
    }

    if (body.type === 'INTERVIEW') {
      if (!body.candidateId || !body.roundName || !body.scheduledTime) {
        return NextResponse.json({ error: 'Missing required interview fields: candidateId, roundName, scheduledTime' }, { status: 400 });
      }

      const interview = await scheduleInterview(
        {
          candidateId: body.candidateId,
          interviewerId: body.interviewerId || user.id,
          roundName: body.roundName,
          scheduledTime: body.scheduledTime,
          durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : 45,
          meetingLink: body.meetingLink,
        },
        {
          id: user.id,
          fullName: user.fullName || 'Recruiter',
        }
      );

      return NextResponse.json({
        success: true,
        interview,
      });
    }

    if (body.type === 'EVALUATION') {
      if (!body.interviewId || body.rating === undefined || !body.recommendation) {
        return NextResponse.json({ error: 'Missing evaluation fields: interviewId, rating, recommendation' }, { status: 400 });
      }

      const evaluation = await submitInterviewEvaluation(
        {
          interviewId: body.interviewId,
          rating: Number(body.rating),
          feedback: body.feedback || '',
          recommendation: body.recommendation,
        },
        {
          id: user.id,
          fullName: user.fullName || 'Interviewer',
        }
      );

      return NextResponse.json({
        success: true,
        evaluation,
      });
    }

    if (body.type === 'OFFER') {
      if (!body.candidateId || !body.offeredCtc || !body.offeredRole) {
        return NextResponse.json({ error: 'Missing offer fields: candidateId, offeredCtc, offeredRole' }, { status: 400 });
      }

      const offer = await createJobOffer(
        {
          candidateId: body.candidateId,
          offeredCtc: Number(body.offeredCtc),
          offeredRole: body.offeredRole,
          offeredDepartment: body.offeredDepartment || 'General',
          joiningDate: body.joiningDate || new Date(Date.now() + 14 * 86400000).toISOString(),
          expiryDate: body.expiryDate || new Date(Date.now() + 7 * 86400000).toISOString(),
          offerLetterUrl: body.offerLetterUrl,
        },
        {
          id: user.id,
          fullName: user.fullName || 'HR Manager',
        }
      );

      return NextResponse.json({
        success: true,
        offer,
      });
    }

    if (body.type === 'OFFER_STATUS') {
      if (!body.offerId || !body.status) {
        return NextResponse.json({ error: 'Missing offerId or status' }, { status: 400 });
      }

      const offer = await updateOfferStatus(
        body.offerId,
        body.status,
        {
          id: user.id,
          fullName: user.fullName || 'HR Manager',
        }
      );

      return NextResponse.json({
        success: true,
        offer,
      });
    }

    if (body.type === 'REQUISITION') {
      if (!body.title || !body.departmentId || !body.designation) {
        return NextResponse.json({ error: 'Missing required requisition fields: title, departmentId, designation' }, { status: 400 });
      }

      const requisition = await createJobRequisition(
        {
          title: body.title,
          departmentId: body.departmentId,
          designation: body.designation,
          headcount: Number(body.headcount) || 1,
          employmentType: body.employmentType || 'Full-Time',
          targetDate: body.targetDate || new Date(Date.now() + 30 * 86400000).toISOString(),
          budgetMin: body.budgetMin ? Number(body.budgetMin) : null,
          budgetMax: body.budgetMax ? Number(body.budgetMax) : null,
          reason: body.reason,
        } as any,
        {
          id: user.id,
          fullName: user.fullName || 'Hiring Manager',
        }
      );

      return NextResponse.json({
        success: true,
        requisition,
      });
    }

    // Default: Create Job Opening
    if (!body.title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    const opening = await createJobOpening(
      {
        title: body.title,
        location: body.jobLocation || body.location || 'Corporate HQ (Mumbai)',
        openPositions: Number(body.openPositions) || 1,
        description: body.description || body.title,
        requirements: body.requirements,
        requisitionId: body.requisitionId,
      },
      {
        id: user.id,
        fullName: user.fullName || 'HR Manager',
      }
    );

    return NextResponse.json({
      success: true,
      job: opening,
      opening,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

