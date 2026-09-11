import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';
import { convertDealToClient } from './client-service';

export type AutomationEventType =
  | 'LEAD_CREATED'
  | 'LEAD_ASSIGNED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_QUALIFIED'
  | 'FOLLOW_UP_DUE'
  | 'FOLLOW_UP_OVERDUE'
  | 'OPPORTUNITY_CREATED'
  | 'DEAL_STAGE_CHANGED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'CLIENT_CREATED'
  | 'EMPLOYEE_ASSIGNED'
  | 'ATTENDANCE_LATE'
  | 'ATTENDANCE_ABSENT';

export interface AutomationActor {
  id?: string;
  name?: string;
  role?: string;
  isSystem?: boolean;
}

export interface AutomationPayload {
  entityType: string; // 'Lead', 'Deal', 'Opportunity', 'FollowUp', 'Attendance', 'Client'
  entityId: string;
  data?: Record<string, any>;
  previousData?: Record<string, any>;
}

/**
 * Checks if an automation action has already executed for this entity within the specified window.
 * Ensures strict idempotency and zero spam.
 */
export async function isAutomationAlreadyExecuted(
  event: AutomationEventType,
  entityType: string,
  entityId: string,
  windowHours = 20
): Promise<boolean> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  const existing = await prisma.automationLog.findFirst({
    where: {
      event,
      entityType,
      entityId,
      status: 'SUCCESS',
      executedAt: { gte: since },
    },
  });
  return !!existing;
}

/**
 * Logs an automation execution in the immutable AutomationLog.
 */
export async function recordAutomationLog(params: {
  event: AutomationEventType;
  action: string;
  entityType: string;
  entityId: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  message?: string;
  metadata?: Record<string, any>;
}) {
  try {
    return await prisma.automationLog.create({
      data: {
        event: params.event,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        status: params.status,
        message: params.message || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error('Failed to write AutomationLog:', err);
    return null;
  }
}

/**
 * Central automation engine dispatcher.
 */
export async function triggerAutomationEvent(
  event: AutomationEventType,
  payload: AutomationPayload,
  actor: AutomationActor = { isSystem: true, name: 'SYSTEM_AUTOMATION' }
) {
  try {
    switch (event) {
      // ----------------------------------------------------
      // 1. LEAD AUTOMATIONS
      // ----------------------------------------------------
      case 'LEAD_CREATED': {
        const lead = await prisma.lead.findUnique({
          where: { id: payload.entityId },
          include: { assignedTo: true },
        });
        if (!lead) return;

        if (lead.assignedToId) {
          await sendNotification({
            recipientId: lead.assignedToId,
            title: `New Lead Assigned: ${lead.companyName}`,
            message: `${actor.name || 'System'} assigned you lead ${lead.leadNumber} (${lead.fullName}).`,
            category: 'CRM',
            entityType: 'LEAD',
            entityId: lead.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'NOTIFY_ASSIGNEE',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Lead creation processed. Assigned to ${lead.assignedTo?.fullName || 'Unassigned'}.`,
        });
        break;
      }

      case 'LEAD_ASSIGNED': {
        const lead = await prisma.lead.findUnique({
          where: { id: payload.entityId },
          include: { assignedTo: true },
        });
        if (!lead || !lead.assignedToId) return;

        await sendNotification({
          recipientId: lead.assignedToId,
          title: `Lead Reassigned: ${lead.companyName}`,
          message: `You are now the lead owner for ${lead.leadNumber} (${lead.companyName}).`,
          category: 'CRM',
          entityType: 'LEAD',
          entityId: lead.id,
        });

        await recordAutomationLog({
          event,
          action: 'NOTIFY_REASSIGNMENT',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Notified ${lead.assignedTo?.fullName || 'Assignee'} of lead reassignment.`,
        });
        break;
      }

      case 'LEAD_QUALIFIED': {
        const lead = await prisma.lead.findUnique({
          where: { id: payload.entityId },
        });
        if (!lead) return;

        // Auto-create a high-priority follow-up task if none exists
        const existingFollowUp = await prisma.followUp.findFirst({
          where: { leadId: lead.id, status: 'PENDING' },
        });

        if (!existingFollowUp && lead.assignedToId) {
          const scheduledDate = new Date(Date.now() + 24 * 3600 * 1000); // Tomorrow
          await prisma.followUp.create({
            data: {
              followUpNumber: `FLW-AUTO-${Date.now().toString().slice(-4)}`,
              leadId: lead.id,
              assignedToId: lead.assignedToId,
              scheduledAt: scheduledDate,
              title: 'Discovery & Proposal Scoping Call',
              remarks: 'Lead marked QUALIFIED. Scoping discussion required.',
              priority: 'HIGH',
              status: 'PENDING',
            },
          });
        }

        await recordAutomationLog({
          event,
          action: 'SCHEDULE_QUALIFIED_FOLLOWUP',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Lead qualified. Verified follow-up scheduling.`,
        });
        break;
      }

      // ----------------------------------------------------
      // 2. FOLLOW-UP AUTOMATIONS
      // ----------------------------------------------------
      case 'FOLLOW_UP_DUE': {
        const alreadyFired = await isAutomationAlreadyExecuted(event, payload.entityType, payload.entityId, 18);
        if (alreadyFired) {
          await recordAutomationLog({
            event,
            action: 'SEND_REMINDER',
            entityType: payload.entityType,
            entityId: payload.entityId,
            status: 'SKIPPED',
            message: 'Due reminder already dispatched within window.',
          });
          return;
        }

        const followUp = await prisma.followUp.findUnique({
          where: { id: payload.entityId },
          include: { lead: true, deal: true, assignedTo: true },
        });
        if (!followUp || !followUp.assignedToId || followUp.status !== 'PENDING') return;

        const subject = followUp.lead?.companyName || followUp.deal?.title || 'CRM Prospect';
        await sendNotification({
          recipientId: followUp.assignedToId,
          title: `⏰ Follow-up Due Today: ${subject}`,
          message: `Your scheduled follow-up "${followUp.title}" is due today.`,
          category: 'CRM',
          entityType: 'FOLLOW_UP',
          entityId: followUp.id,
        });

        await recordAutomationLog({
          event,
          action: 'SEND_REMINDER',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Dispatched due notification to ${followUp.assignedTo?.fullName || 'Assignee'}.`,
        });
        break;
      }

      case 'FOLLOW_UP_OVERDUE': {
        const alreadyFired = await isAutomationAlreadyExecuted(event, payload.entityType, payload.entityId, 22);
        if (alreadyFired) {
          await recordAutomationLog({
            event,
            action: 'SEND_OVERDUE_ALERT',
            entityType: payload.entityType,
            entityId: payload.entityId,
            status: 'SKIPPED',
            message: 'Overdue alert already dispatched within window.',
          });
          return;
        }

        const followUp = await prisma.followUp.findUnique({
          where: { id: payload.entityId },
          include: { lead: true, deal: true, assignedTo: true },
        });
        if (!followUp || !followUp.assignedToId || followUp.status !== 'PENDING') return;

        const subject = followUp.lead?.companyName || followUp.deal?.title || 'CRM Prospect';
        await sendNotification({
          recipientId: followUp.assignedToId,
          title: `⚠️ OVERDUE Follow-up: ${subject}`,
          message: `Follow-up "${followUp.title}" scheduled for ${new Date(followUp.scheduledAt).toLocaleDateString()} is past due. Please update immediately.`,
          category: 'CRM',
          entityType: 'FOLLOW_UP',
          entityId: followUp.id,
        });

        await recordAutomationLog({
          event,
          action: 'SEND_OVERDUE_ALERT',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Dispatched overdue alert to ${followUp.assignedTo?.fullName || 'Assignee'}.`,
        });
        break;
      }

      // ----------------------------------------------------
      // 3. DEAL STAGE & WON/LOST AUTOMATIONS
      // ----------------------------------------------------
      case 'DEAL_STAGE_CHANGED': {
        const deal = await prisma.deal.findUnique({
          where: { id: payload.entityId },
          include: { assignedTo: true },
        });
        if (!deal) return;

        if (deal.assignedToId) {
          await sendNotification({
            recipientId: deal.assignedToId,
            title: `Deal Stage Updated: ${deal.title}`,
            message: `Deal advanced to stage ${deal.stage} (Probability: ${deal.probability}%).`,
            category: 'CRM',
            entityType: 'DEAL',
            entityId: deal.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'STAGE_CHANGE_RECORDED',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Deal stage change to ${deal.stage} logged.`,
        });
        break;
      }

      case 'DEAL_WON': {
        // Idempotency: Trigger existing Deal -> Client conversion bridge
        const deal = await prisma.deal.findUnique({
          where: { id: payload.entityId },
        });
        if (!deal) return;

        let conversionResult = null;
        if (!deal.isConvertedToClient) {
          conversionResult = await convertDealToClient(
            deal.id,
            {},
            { id: actor.id, fullName: actor.name || 'Automation Engine', employeeId: null }
          );
        }

        if (deal.assignedToId) {
          await sendNotification({
            recipientId: deal.assignedToId,
            title: `🎉 Deal WON: ${deal.title}`,
            message: `Congratulations! Deal of ₹${(deal.amount || 0).toLocaleString()} was marked WON. Client account is operational.`,
            category: 'CRM',
            entityType: 'DEAL',
            entityId: deal.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'CONVERT_DEAL_TO_CLIENT',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: deal.isConvertedToClient
            ? 'Deal was already converted; idempotency preserved.'
            : `Converted deal to Client ${conversionResult?.client?.clientId}.`,
        });
        break;
      }

      case 'DEAL_LOST': {
        const deal = await prisma.deal.findUnique({
          where: { id: payload.entityId },
          include: { assignedTo: true },
        });
        if (!deal) return;

        if (deal.assignedToId) {
          await sendNotification({
            recipientId: deal.assignedToId,
            title: `Deal Marked Lost: ${deal.title}`,
            message: `Reason: ${deal.lostReason || 'Unspecified'}. Value: ₹${(deal.amount || 0).toLocaleString()}.`,
            category: 'CRM',
            entityType: 'DEAL',
            entityId: deal.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'DEAL_LOST_PROCESSED',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Lost deal processed with reason ${deal.lostReason || 'N/A'}.`,
        });
        break;
      }

      // ----------------------------------------------------
      // 4. WORKFORCE & ATTENDANCE ALERTS
      // ----------------------------------------------------
      case 'ATTENDANCE_LATE': {
        const alreadyFired = await isAutomationAlreadyExecuted(event, payload.entityType, payload.entityId, 12);
        if (alreadyFired) return;

        const att = await prisma.attendance.findUnique({
          where: { id: payload.entityId },
          include: { employee: { include: { reportingManager: true } } },
        });
        if (!att || !att.isLate) return;

        // If reporting manager exists, notify them
        if (att.employee.reportingManagerId) {
          await sendNotification({
            recipientId: att.employee.reportingManagerId,
            title: `⏱️ Late Arrival Alert: ${att.employee.fullName}`,
            message: `${att.employee.fullName} (${att.employee.employeeId}) punched in late today (${att.date}).`,
            category: 'ATTENDANCE',
            entityType: 'EMPLOYEE',
            entityId: att.employee.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'NOTIFY_LATE_ARRIVAL',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Late arrival alert recorded for ${att.employee.fullName}.`,
        });
        break;
      }

      case 'ATTENDANCE_ABSENT': {
        const emp = await prisma.employee.findUnique({
          where: { id: payload.entityId },
          include: { reportingManager: true },
        });
        if (!emp) return;

        if (emp.reportingManagerId) {
          await sendNotification({
            recipientId: emp.reportingManagerId,
            title: `⚠️ Unplanned Absence: ${emp.fullName}`,
            message: `No punch-in recorded for ${emp.fullName} today.`,
            category: 'ATTENDANCE',
            entityType: 'EMPLOYEE',
            entityId: emp.id,
          });
        }

        await recordAutomationLog({
          event,
          action: 'NOTIFY_ABSENCE',
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: 'SUCCESS',
          message: `Absence alert recorded for ${emp.fullName}.`,
        });
        break;
      }

      default:
        console.warn(`Unhandled automation event: ${event}`);
    }
  } catch (error: any) {
    console.error(`Error executing automation event ${event}:`, error);
    await recordAutomationLog({
      event,
      action: 'EXECUTE_AUTOMATION',
      entityType: payload.entityType,
      entityId: payload.entityId,
      status: 'FAILED',
      message: error.message || 'Unknown automation error',
    });
  }
}
