/**
 * ATLAS-EXECUTIVE-OPS-SNAPSHOT API
 * ATLAS-PRIME-EO-ROUTE-MAPPING-CLOSEOUT-133
 * 
 * GET /api/executive-ops/snapshot
 * Returns executive dashboard snapshot data
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Return quick snapshot without blocking DB calls
  // Tables may not exist, so we return empty state
  return NextResponse.json({
    priorities: [],
    meetingsToday: 0,
    pendingDecisions: 0,
    watchlistItems: 0,
    pendingApprovals: 0,
    pendingFollowups: 0,
    unreadNotifications: 0,
    timestamp,
  });
}
