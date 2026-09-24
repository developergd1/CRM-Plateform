import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export interface WorkflowRule {
  id?: string;
  name: string;
  trigger: 'LEAD_CREATED' | 'LEAD_QUALIFIED' | 'DEAL_STAGE_CHANGED' | 'DEAL_WON' | 'CONTRACT_EXPIRING';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  }>;
  actions: Array<{
    type: 'ASSIGN_USER' | 'CREATE_TASK' | 'CREATE_FOLLOW_UP' | 'SEND_NOTIFICATION';
    payload: any;
  }>;
  isActive?: boolean;
}

export async function listWorkflows() {
  return await prisma.crmWorkflow.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkflow(input: WorkflowRule) {
  const workflow = await prisma.crmWorkflow.create({
    data: {
      name: input.name,
      trigger: input.trigger,
      conditions: JSON.stringify(input.conditions || []),
      actions: JSON.stringify(input.actions || []),
      isActive: input.isActive !== undefined ? input.isActive : true,
    },
  });

  return workflow;
}

export async function evaluateAndTriggerWorkflows(
  trigger: string,
  entityType: 'Lead' | 'Deal' | 'Contract',
  entityData: any,
  actor?: { id?: string; name?: string }
) {
  const workflows = await prisma.crmWorkflow.findMany({
    where: { trigger, isActive: true },
  });

  const executedActions: string[] = [];

  for (const wf of workflows) {
    let conditions: any[] = [];
    let actions: any[] = [];
    try {
      conditions = JSON.parse(wf.conditions);
      actions = JSON.parse(wf.actions);
    } catch {
      continue;
    }

    // Evaluate conditions
    const match = conditions.every((c) => {
      const val = entityData[c.field];
      if (val === undefined || val === null) return false;
      if (c.operator === 'equals') return String(val).toLowerCase() === String(c.value).toLowerCase();
      if (c.operator === 'contains') return String(val).toLowerCase().includes(String(c.value).toLowerCase());
      if (c.operator === 'greaterThan') return Number(val) > Number(c.value);
      if (c.operator === 'lessThan') return Number(val) < Number(c.value);
      return false;
    });

    if (match || conditions.length === 0) {
      // Execute actions
      for (const act of actions) {
        if (act.type === 'CREATE_TASK' && entityData.id) {
          await prisma.task.create({
            data: {
              taskNumber: `TSK-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
              title: act.payload.title || `Follow-up on ${entityType}: ${entityData.title || entityData.leadNumber}`,
              priority: act.payload.priority || 'MEDIUM',
              status: 'TODO',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              ...(entityType === 'Lead' ? { leadId: entityData.id } : {}),
              ...(entityType === 'Deal' ? { dealId: entityData.id } : {}),
            },
          });
          executedActions.push(`Created task for ${entityType}`);
        }
      }

      await logAuditEvent({
        actorUserId: actor?.id || null,
        actorEmployeeId: 'WORKFLOW_ENGINE',
        action: 'WORKFLOW_TRIGGERED',
        entityType: 'WORKFLOW',
        entityId: wf.id,
        newData: { trigger, workflowName: wf.name, executedActions },
        status: 'SUCCESS',
      });
    }
  }

  return { triggeredCount: workflows.length, executedActions };
}
