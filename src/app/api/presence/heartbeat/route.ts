import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
      } catch {}
    }

    const { currentPath, currentTab, pageTitle, isDisconnect } = body;
    const sessionKey = `presence_${user.id}`;

    if (isDisconnect) {
      await prisma.activeUserSession.deleteMany({
        where: { sessionToken: sessionKey },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        isOnline: false,
      });
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    // Format readable page identifier e.g. "CRM Dashboard - Leads View (/portal)"
    const readablePage = [
      currentTab ? currentTab.toUpperCase() : '',
      pageTitle || '',
      currentPath || '',
    ]
      .filter(Boolean)
      .join(' • ')
      .slice(0, 120) || 'Active in Workspace';

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Upsert user's presence record
    const presenceRecord = await prisma.activeUserSession.upsert({
      where: { sessionToken: sessionKey },
      create: {
        userId: user.id,
        sessionToken: sessionKey,
        ipAddress: ip,
        userAgent,
        deviceType: readablePage,
        isValid: true,
        expiresAt: expires,
        lastActiveAt: now,
      },
      update: {
        ipAddress: ip,
        deviceType: readablePage,
        isValid: true,
        lastActiveAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      lastActiveAt: presenceRecord.lastActiveAt,
      isOnline: true,
    });
  } catch (error: any) {
    console.error('Presence heartbeat error:', error);
    return NextResponse.json({ error: error.message || 'Heartbeat failed' }, { status: 500 });
  }
}
