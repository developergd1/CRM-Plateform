import { NextRequest, NextResponse } from 'next/server';
import { POST as blockHandler } from '../block/route';

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  return blockHandler(req, context);
}
