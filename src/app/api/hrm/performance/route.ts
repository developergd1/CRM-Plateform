import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getPerformanceCycles,
  createPerformanceCycle,
  getEmployeeGoals,
  createGoal,
  updateGoalProgress,
  submitPerformanceReview,
  getPerformanceReviews,
} from '@/services/hrm/performance.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get('employeeId');
    const cycleId = searchParams.get('cycleId') || undefined;

    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (employeeId && employeeId !== ownEmpId && employeeId !== user.employeeProfile?.id && employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own performance records.' }, { status: 403 });
      }
      employeeId = ownEmpId || null;
    }

    const [cycles, goals, allReviews] = await Promise.all([
      getPerformanceCycles(),
      getEmployeeGoals({ employeeId: employeeId || undefined }),
      getPerformanceReviews(cycleId),
    ]);

    // Role-based review filtering
    const reviews = user.role === 'EMPLOYEE'
      ? allReviews.filter((r: any) => r.employeeId === (user.employeeProfile?.id || user.employeeId) || r.employee?.employeeId === user.employeeId)
      : allReviews;

    return NextResponse.json({
      success: true,
      cycles,
      goals,
      reviews,
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

    if (body.type === 'UPDATE_PROGRESS') {
      const goal = await updateGoalProgress(
        body.goalId,
        Number(body.currentValue),
        {
          id: user.id,
          fullName: user.fullName || 'User',
        }
      );
      return NextResponse.json({ success: true, goal });
    }

    if (body.type === 'REVIEW') {
      let targetEmpId = body.employeeId || user.employeeProfile?.id || user.employeeId;
      if (user.role === 'EMPLOYEE') {
        const ownEmpId = user.employeeProfile?.id || user.employeeId;
        if (body.employeeId && body.employeeId !== ownEmpId && body.employeeId !== user.employeeProfile?.id && body.employeeId !== user.employeeId) {
          return NextResponse.json({ error: 'Permission denied. Employees cannot review other personnel.' }, { status: 403 });
        }
        targetEmpId = ownEmpId;
      }

      const review = await submitPerformanceReview(
        {
          cycleId: body.cycleId,
          employeeId: targetEmpId,
          selfRating: body.selfRating !== undefined ? Number(body.selfRating) : undefined,
          selfComments: body.selfComments,
          managerRating: body.managerRating !== undefined ? Number(body.managerRating) : undefined,
          managerComments: body.managerComments,
        },
        {
          id: user.id,
          fullName: user.fullName || 'Reviewer',
          role: user.role,
        }
      );
      return NextResponse.json({ success: true, review });
    }

    if (body.type === 'CYCLE') {
      if (user.role === 'EMPLOYEE') {
        return NextResponse.json({ error: 'Permission denied. Only HR/Admins can configure performance cycles.' }, { status: 403 });
      }

      const cycle = await createPerformanceCycle(
        {
          title: body.title,
          startDate: body.startDate,
          endDate: body.endDate,
          description: body.description,
        } as any,
        {
          id: user.id,
          fullName: user.fullName || 'HR Manager',
        }
      );
      return NextResponse.json({ success: true, cycle });
    }

    // Default: Create Goal
    let targetEmployeeId = body.employeeId || user.employeeProfile?.id || user.employeeId;
    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (body.employeeId && body.employeeId !== ownEmpId && body.employeeId !== user.employeeProfile?.id && body.employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You cannot create goals for another employee.' }, { status: 403 });
      }
      targetEmployeeId = ownEmpId;
    }

    if (!targetEmployeeId || !body.title) {
      return NextResponse.json({ error: 'Missing employeeId or title' }, { status: 400 });
    }

    const goal = await createGoal(
      {
        employeeId: targetEmployeeId,
        title: body.title,
        description: body.description,
        category: body.category || 'INDIVIDUAL',
        targetMetric: body.targetMetric || 'PERCENT',
        startValue: Number(body.startValue) || 0,
        targetValue: Number(body.targetValue) || 100,
        currentValue: Number(body.currentValue) || 0,
        startDate: body.startDate || new Date().toISOString(),
        targetDate: body.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        keyResults: body.keyResults,
      } as any,
      {
        id: user.id,
        fullName: user.fullName || 'User',
      }
    );

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
