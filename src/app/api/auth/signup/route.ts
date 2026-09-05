import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Public registration is disabled. Client accounts can only be provisioned by Platform Administrators.',
    },
    { status: 403 }
  );
}
