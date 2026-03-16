/**
 * ATLAS-CALENDAR-TODAY API
 * ATLAS-PRIME-EO-APP-ROUTE-RECONCILIATION-134
 * 
 * GET /api/calendar/today
 * Returns today's events and free time slots
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Calculate workday free slots
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const workStart = new Date(today);
  workStart.setHours(9, 0, 0, 0);
  const workEnd = new Date(today);
  workEnd.setHours(18, 0, 0, 0);
  
  return NextResponse.json({
    connected: true,
    events: [],
    freeSlots: [{
      start: workStart.toISOString(),
      end: workEnd.toISOString(),
    }],
    nextEvent: null,
    timestamp,
  });
}
