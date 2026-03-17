import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    success: true,
    version: '6008-FIXED',
    timestamp: new Date().toISOString(),
    message: 'Decompose fix deployed'
  });
}
