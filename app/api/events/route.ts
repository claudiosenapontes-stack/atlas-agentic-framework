import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/events
// Canonical event log for Mission Control

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const eventType = searchParams.get('eventType');
    const actorId = searchParams.get('actorId');
    const targetType = searchParams.get('targetType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO timestamp
    
    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }
    
    if (targetType) {
      query = query.eq('target_type', targetType);
    }
    
    if (since) {
      query = query.gt('created_at', since);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Events API] Failed to fetch:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      events: data || [],
      count: data?.length || 0,
    });
    
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
