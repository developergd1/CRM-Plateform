import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { id } = params;
    const { content, isPinned = false } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ id }, { clientId: id }] },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const note = await prisma.clientNote.create({
      data: {
        clientId: client.id,
        authorId: currentEmp.id,
        content: content.trim(),
        isPinned,
      },
      include: {
        author: { select: { employeeId: true, fullName: true } },
      },
    });

    // Also record on activity timeline
    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType: 'NOTE_ADDED',
        title: isPinned ? 'Pinned Note Added' : 'Internal Note Added',
        description: content.length > 80 ? `${content.substring(0, 80)}...` : content,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
