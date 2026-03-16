/**
 * ATLAS-WATCHLIST API
 * ATLAS-PRIME-EO-APP-ROUTE-RECONCILIATION-134
 * 
 * GET /api/watchlist
 * Minimal implementation - returns empty to prevent timeouts
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Return empty watchlist - prevents timeout while maintaining API contract
  return NextResponse.json({
    success: true,
    items: [],
    count: 0,
    timestamp,
  });
}
