import { NextRequest, NextResponse } from 'next/server';
import { hrmStore, HrmWorkflow } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'ten-growth-india';

    const workflows = hrmStore.workflows.filter((w) => w.tenantId === tenantId);

    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = body.tenantId || 'ten-growth-india';

    if (body.action === 'TEST_EXECUTE') {
      // Simulate workflow trigger execution
      const wf = hrmStore.workflows.find((w) => w.id === body.workflowId);
      if (!wf) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      const executionLog = {
        workflowId: wf.id,
        workflowTitle: wf.title,
        triggeredAt: new Date().toISOString(),
        eventReceived: wf.triggerEvent,
        conditionMet: true,
        stepsExecuted: wf.steps.map((s, idx) => ({
          step: idx + 1,
          name: s.stepName,
          approver: s.approverRole,
          status: 'PENDING_ACTION',
          deadline: `Within ${s.timeoutHours}h`,
        })),
        actionScheduled: wf.action.details,
        notificationsDispatched: wf.notifications.map((n) => ({
          target: n.targetRole,
          channel: n.channel,
          preview: n.message,
        })),
      };

      return NextResponse.json({
        success: true,
        simulation: executionLog,
        message: `Workflow "${wf.title}" evaluated and executed successfully!`,
      });
    }

    // Workflow Rule Creation
    if (!body.title || !body.triggerEvent) {
      return NextResponse.json({ error: 'Title and Trigger Event are required' }, { status: 400 });
    }

    const newWf: HrmWorkflow = {
      id: `wf-${Date.now()}`,
      tenantId,
      title: body.title,
      triggerEvent: body.triggerEvent,
      condition: body.condition || { field: 'value', operator: 'GREATER_THAN', value: 0 },
      steps: body.steps || [{ stepName: 'Management Signoff', approverRole: 'MANAGER', timeoutHours: 24 }],
      action: body.action || { type: 'UPDATE_RECORD', details: 'Auto update employee record.' },
      notifications: body.notifications || [
        { targetRole: 'EMPLOYEE', channel: 'EMAIL', message: 'Workflow step completed.' },
      ],
      isActive: true,
    };

    hrmStore.workflows.unshift(newWf);

    return NextResponse.json({
      success: true,
      workflow: newWf,
      message: 'New dynamic workflow rule compiled and activated in engine',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
