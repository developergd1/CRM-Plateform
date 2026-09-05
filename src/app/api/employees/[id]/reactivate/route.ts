import { NextRequest, NextResponse } from 'next/server';
import { POST as unblockHandler } from '../unblock/route';

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  return unblockHandler(req, context);
}
