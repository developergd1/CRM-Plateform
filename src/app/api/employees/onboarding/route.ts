import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';

const DRAFTS_KEY = 'EMS_ONBOARDING_DRAFTS';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const setting = await prisma.systemSetting.findUnique({ where: { key: DRAFTS_KEY } });
    const drafts = setting?.value ? JSON.parse(setting.value) : [];

    return NextResponse.json({ success: true, drafts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('id');
    if (!draftId) return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });

    const setting = await prisma.systemSetting.findUnique({ where: { key: DRAFTS_KEY } });
    if (setting?.value) {
      const drafts = JSON.parse(setting.value).filter((d: any) => d.id !== draftId);
      await prisma.systemSetting.update({
        where: { key: DRAFTS_KEY },
        data: { value: JSON.stringify(drafts) },
      });
    }

    return NextResponse.json({ success: true, message: 'Draft removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
