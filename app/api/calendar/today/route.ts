/**
 * ATLAS-CALENDAR-TODAY API
 * ATLAS-PRIME-EO-ROUTE-MAPPING-CLOSEOUT-133
 * 
 * GET /api/calendar/today
 * Returns today's events and free time slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Get today's date bounds
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fetch events for today
    const { data: events, error } = await (supabase as any)
      .from('executive_events')
      .select('*')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: true });
    
    if (error) {
      return NextResponse.json({
        connected: false,
        events: [],
        freeSlots: [],
        error: error.message,
        timestamp,
      });
    }
    
    // Calculate free slots (simplified - assumes 9am-6pm workday)
    const workStart = new Date(today);
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(today);
    workEnd.setHours(18, 0, 0, 0);
    
    const freeSlots: any[] = [];
    let currentTime = workStart;
    
    for (const event of events || []) {
      const eventStart = new Date(event.start_time);
      if (eventStart > currentTime) {
        freeSlots.push({
          start: currentTime.toISOString(),
          end: eventStart.toISOString(),
        });
      }
      currentTime = new Date(event.end_time || eventStart.getTime() + 3600000);
    }
    
    if (currentTime < workEnd) {
      freeSlots.push({
        start: currentTime.toISOString(),
        end: workEnd.toISOString(),
      });
    }
    
    return NextResponse.json({
      connected: true,
      events: events || [],
      freeSlots,
      nextEvent: events?.[0] || null,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      events: [],
      freeSlots: [],
      error: error.message,
      timestamp,
    });
  }
}
