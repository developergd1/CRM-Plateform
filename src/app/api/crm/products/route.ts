import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM, canManageCRM } from '@/lib/rbac';
import { listProducts, createProduct } from '@/services/crm/commercial.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const type = searchParams.get('type')?.trim() || '';

    const products = await listProducts({ search, type, activeOnly: true });
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Error listing products:', error);
    return NextResponse.json({ error: error.message || 'Failed to list products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.name?.trim() || body.unitPrice === undefined) {
      return NextResponse.json({ error: 'Product Name and Unit Price are required.' }, { status: 400 });
    }

    const product = await createProduct({
      ...body,
      actorUserId: user.id,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
