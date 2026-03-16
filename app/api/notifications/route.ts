/**
 * ATLAS-NOTIFICATIONS API
 * ATLAS-PRIME-EO-APP-ROUTE-RECONCILIATION-134
 * 
 * GET /api/notifications
 * Returns notifications for the current user
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Return empty notifications array
  // This prevents frontend blocking while maintaining API contract
  return NextResponse.json({
    notifications: [],
    unreadCount: 0,
    timestamp,
  });
}
