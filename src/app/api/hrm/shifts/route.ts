import { NextRequest, NextResponse } from 'next/server';
import { hrmStore, HrmShift } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'ten-growth-india';

    const shifts = hrmStore.shifts.filter((s) => s.tenantId === tenantId);

    return NextResponse.json({
      success: true,
      shifts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = body.tenantId || 'ten-growth-india';

    if (!body.name || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Name, Start Time and End Time are required' }, { status: 400 });
    }

    const newShift: HrmShift = {
      id: `sh-${Date.now()}`,
      tenantId,
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      gracePeriodMinutes: Number(body.gracePeriodMinutes) || 15,
      assignedEmployees: 0,
      days: body.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    };

    hrmStore.shifts.push(newShift);

    return NextResponse.json({
      success: true,
      shift: newShift,
      message: 'New shift schedule created successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
