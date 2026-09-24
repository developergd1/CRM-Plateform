import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  general: {
    companyName: 'Growth India',
    crmTitle: 'Growth India CRM Platform',
    supportEmail: 'support@growthindia.com',
    supportPhone: '+91 98765 43210',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: '04-01',
  },
  leads: {
    autoLeadNumberPrefix: 'LD-',
    defaultLeadSource: 'WEBSITE',
    defaultLeadPriority: 'MEDIUM',
    defaultLeadStatus: 'NEW',
    duplicateCheckPhone: true,
    duplicateCheckEmail: true,
    staleLeadDays: 14,
    autoAssignStrategy: 'ROUND_ROBIN',
  },
  deals: {
    autoDealNumberPrefix: 'DL-',
    defaultPipelineCode: 'STANDARD',
    requireWinReason: true,
    requireLossReason: true,
    allowNegativeAmounts: false,
    staleDealDays: 30,
    notifyOnDealWon: true,
  },
  activities: {
    defaultCallDurationMinutes: 15,
    taskDueReminderMinutes: 60,
    enableActivityAudit: true,
  },
  accounts: {
    autoAccountCodePrefix: 'ACC-',
    defaultAccountType: 'COMMERCIAL',
    enforceIndustryClassification: true,
  },
  notifications: {
    emailOnLeadAssigned: true,
    emailOnDealWon: true,
    whatsappAlertsEnabled: false,
    dailySummaryDigest: true,
  },
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settingRecord = await prisma.systemSetting.findUnique({
      where: { key: 'CRM_GLOBAL_SETTINGS' },
    });

    let settings = DEFAULT_SETTINGS;
    if (settingRecord && settingRecord.value) {
      try {
        const parsed = typeof settingRecord.value === 'string' ? JSON.parse(settingRecord.value) : settingRecord.value;
        settings = {
          general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
          leads: { ...DEFAULT_SETTINGS.leads, ...(parsed.leads || {}) },
          deals: { ...DEFAULT_SETTINGS.deals, ...(parsed.deals || {}) },
          activities: { ...DEFAULT_SETTINGS.activities, ...(parsed.activities || {}) },
          accounts: { ...DEFAULT_SETTINGS.accounts, ...(parsed.accounts || {}) },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
        };
      } catch (err) {
        console.error('Failed to parse CRM settings from DB, using defaults', err);
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching CRM settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Administrator privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid settings body payload' }, { status: 400 });
    }

    const existing = await prisma.systemSetting.findUnique({
      where: { key: 'CRM_GLOBAL_SETTINGS' },
    });

    let prevSettings = DEFAULT_SETTINGS;
    if (existing?.value) {
      try {
        prevSettings = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
      } catch (e) {}
    }

    const updatedSettings = {
      general: { ...prevSettings.general, ...(body.general || {}) },
      leads: { ...prevSettings.leads, ...(body.leads || {}) },
      deals: { ...prevSettings.deals, ...(body.deals || {}) },
      activities: { ...prevSettings.activities, ...(body.activities || {}) },
      accounts: { ...prevSettings.accounts, ...(body.accounts || {}) },
      notifications: { ...prevSettings.notifications, ...(body.notifications || {}) },
    };

    await prisma.systemSetting.upsert({
      where: { key: 'CRM_GLOBAL_SETTINGS' },
      create: {
        key: 'CRM_GLOBAL_SETTINGS',
        value: JSON.stringify(updatedSettings),
        category: 'CRM',
        description: 'Global configuration settings for CRM administration and operations',
        updatedByEmployeeId: user.employeeId || null,
      },
      update: {
        value: JSON.stringify(updatedSettings),
        updatedByEmployeeId: user.employeeId || null,
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'UPDATE_CRM_SETTINGS',
      entityType: 'SYSTEM',
      entityId: 'CRM_GLOBAL_SETTINGS',
      previousData: prevSettings,
      newData: updatedSettings,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'CRM Administration settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Error saving CRM settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
