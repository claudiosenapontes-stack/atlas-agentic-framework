/**
 * Test route to verify deployment
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test route working',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    message: 'POST working',
    received: body,
    timestamp: new Date().toISOString(),
  });
}
