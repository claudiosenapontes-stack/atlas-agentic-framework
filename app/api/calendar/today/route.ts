/**
 * ATLAS-CALENDAR-TODAY API
 * ATLAS-PRIME-EXEC-OPS-CLEAN-UI-9802
 * 
 * GET /api/calendar/today
 * Returns REAL today's events from executive_events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const workStart = new Date(today);
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(today);
    workEnd.setHours(18, 0, 0, 0);
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('executive_events')
      .select('*')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .in('status', ['confirmed', 'pending'])
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('[Calendar Today] Query error:', error);
      return NextResponse.json({
        connected: true,
        events: [],
        freeSlots: [{ start: workStart.toISOString(), end: workEnd.toISOString() }],
        nextEvent: null,
        timestamp,
        error: error.message,
        build_marker: 'EXEC-OPS-CLEAN-9802'
      });
    }
    
    // Transform DB fields to CalendarEvent format
    const events = (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      location: e.location || undefined,
      meetLink: e.meet_link || undefined,
      attendees: e.attendees || [],
      isRecurring: false,
      eventType: e.is_virtual ? 'virtual' : 'in_person',
      confirmed: e.status === 'confirmed',
      description: e.description || undefined
    }));
    
    const nextEvent = events.find((e: any) => new Date(e.start) > new Date()) || null;
    
    return NextResponse.json({
      connected: true,
      events,
      count: events.length,
      freeSlots: events.length === 0 ? [{ start: workStart.toISOString(), end: workEnd.toISOString() }] : [],
      nextEvent,
      timestamp,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
    
  } catch (error: any) {
    console.error('[Calendar Today] Error:', error);
    return NextResponse.json({
      connected: false,
      events: [],
      freeSlots: [],
      nextEvent: null,
      timestamp,
      error: error.message,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
  }
}
