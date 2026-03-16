/**
 * ATLAS-COMMANDS API
 * ATLAS-PRIME-EO-APP-ROUTE-RECONCILIATION-134
 * 
 * GET /api/commands
 * Minimal implementation - returns empty to prevent timeouts
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    commands: [],
    timestamp,
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    success: false,
    error: 'Command execution not implemented',
    timestamp,
  }, { status: 501 });
}
