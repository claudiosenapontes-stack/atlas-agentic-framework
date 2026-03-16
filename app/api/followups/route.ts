/**
 * ATLAS-FOLLOWUPS API
 * ATLAS-PRIME-EO-APP-ROUTE-RECONCILIATION-134
 * 
 * GET /api/followups
 * Minimal implementation - returns empty to prevent timeouts
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Return empty followups - prevents timeout while maintaining API contract
  return NextResponse.json({
    success: true,
    followups: [],
    count: 0,
    stats: {
      total: 0,
      by_status: {},
      overdue: 0,
    },
    timestamp,
  });
}
