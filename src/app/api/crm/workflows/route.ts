import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canManageCRM } from '@/lib/rbac';
import { listWorkflows, createWorkflow } from '@/services/crm/workflow.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const workflows = await listWorkflows();
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.name || !body.trigger) {
      return NextResponse.json({ error: 'Workflow name and trigger are required.' }, { status: 400 });
    }

    const workflow = await createWorkflow(body);
    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: error.message || 'Failed to create workflow' }, { status: 500 });
  }
}
