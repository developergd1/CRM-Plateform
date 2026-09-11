import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { notifyTaskComment } from '@/lib/notifications';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comments = await prisma.taskComment.findMany({
      where: { taskId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true, employeeId: true, profilePhotoUrl: true } }
      }
    });

    const enrichedComments = comments.map((c) => {
      const metaStr = c.attachments?.find((a: string) => a.startsWith('__meta__:'));
      let meta: any = null;
      if (metaStr) {
        try {
          meta = JSON.parse(metaStr.replace('__meta__:', ''));
        } catch {}
      }
      return {
        ...c,
        authorName: meta?.authorName || c.author?.fullName || 'User',
        authorRole: meta?.authorRole || (c.author?.employeeId === 'GI-EMP-000001' ? 'ADMIN' : 'EMPLOYEE'),
        isClientAuthor: Boolean(meta?.isClient || meta?.authorRole === 'CLIENT'),
        clientCompany: meta?.companyName,
      };
    });

    return NextResponse.json(enrichedComments);
  } catch (error: any) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json({ error: 'Failed to fetch task comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login to continue.' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        client: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await req.json();
    const { content, attachments } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Resolve author employee ID
    let authorEmployeeId = user.employeeProfile?.id;
    if (!authorEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      authorEmployeeId = emp?.id;
    }

    // If client with no employee profile, fallback to task's assigned employee or creator
    const resolvedAuthorId = authorEmployeeId || task.assignedToId || '';
    if (!resolvedAuthorId) {
      return NextResponse.json({ error: 'Cannot determine author profile for comment' }, { status: 400 });
    }

    const authorName = user.role === 'CLIENT'
      ? (user.companyName || user.fullName || 'Corporate Client')
      : (user.fullName || user.employeeProfile?.fullName || 'Team Member');

    const metaTag = `__meta__:${JSON.stringify({
      authorName,
      authorRole: user.role,
      isClient: user.role === 'CLIENT',
      companyName: user.companyName,
    })}`;

    const rawAttachments = Array.isArray(attachments)
      ? attachments.filter((a: string) => !a.startsWith('__meta__:'))
      : [];

    const comment = await prisma.taskComment.create({
      data: {
        taskId: params.id,
        authorId: resolvedAuthorId,
        content: content.trim(),
        attachments: [metaTag, ...rawAttachments],
      },
      include: {
        author: { select: { id: true, fullName: true, employeeId: true, profilePhotoUrl: true } }
      }
    });

    // Send cross-profile notifications
    await notifyTaskComment({
      taskId: task.id,
      taskNumber: task.taskNumber,
      commentContent: content.trim(),
      authorName,
      authorRole: user.role,
      assignedToId: task.assignedToId,
      clientId: task.clientId,
      createdById: task.createdById,
    });

    const responseComment = {
      ...comment,
      authorName,
      authorRole: user.role,
      isClientAuthor: user.role === 'CLIENT',
      clientCompany: user.companyName,
    };

    return NextResponse.json(responseComment, { status: 201 });
  } catch (error: any) {
    console.error('Error adding task comment:', error);
    return NextResponse.json({ error: error.message || 'Failed to add task comment' }, { status: 500 });
  }
}
