import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { scheduleInterview, submitInterviewEvaluation } from '@/services/hrm/recruitment.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body.type === 'EVALUATION') {
      const evaluation = await submitInterviewEvaluation(
        {
          interviewId: body.interviewId,
          interviewerId: user.id,
          interviewerName: user.fullName || 'Interviewer',
          technicalRating: Number(body.technicalRating) || 3,
          communicationRating: Number(body.communicationRating) || 3,
          culturalFitRating: Number(body.culturalFitRating) || 3,
          overallRating: Number(body.overallRating) || 3,
          feedback: body.feedback || 'Good assessment',
          recommendation: body.recommendation || 'HIRE',
        } as any,
        {
          id: user.id,
          fullName: user.fullName || 'Interviewer',
        }
      );

      return NextResponse.json({ success: true, evaluation });
    }

    // Default: Schedule Interview
    if (!body.candidateId || !body.roundName || !body.scheduledTime) {
      return NextResponse.json({ error: 'Missing candidateId, roundName, or scheduledTime' }, { status: 400 });
    }

    const interview = await scheduleInterview(
      {
        candidateId: body.candidateId,
        interviewerId: body.interviewerId || user.id,
        roundNumber: Number(body.roundNumber) || 1,
        roundName: body.roundName,
        scheduledTime: body.scheduledTime,
        durationMinutes: Number(body.durationMinutes) || 45,
        meetingLink: body.meetingLink,
        notes: body.notes,
      } as any,
      {
        id: user.id,
        fullName: user.fullName || 'Recruiter',
      }
    );

    return NextResponse.json({ success: true, interview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
