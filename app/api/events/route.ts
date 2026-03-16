import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/events
// Canonical event log for Mission Control
// ATLAS-OPTIMUS-EO-TIMEOUT-CLOSEOUT-097: Switched to getSupabaseAdmin to avoid RLS hangs

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const eventType = searchParams.get('eventType');
    const actorId = searchParams.get('actorId');
    const targetType = searchParams.get('targetType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const since = searchParams.get('since'); // ISO timestamp
    
    const supabase = getSupabaseAdmin();
    
    // Check table exists first
    const { error: tableCheckError } = await (supabase as any)
      .from('events')
      .select('id', { count: 'exact', head: true });
    
    if (tableCheckError) {
      console.error('[Events API] Table check error:', tableCheckError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${tableCheckError.message}`,
        code: tableCheckError.code,
        timestamp,
      }, { status: 500 });
    }
    
    let query = (supabase as any)
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
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
      return NextResponse.json({
        success: false,
        error: `Failed to fetch events: ${error.message}`,
        code: error.code,
        timestamp,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      events: data || [],
      count: data?.length || 0,
      timestamp,
    });
    
  } catch (error: any) {
    console.error('[Events API] Error:', error);
    return NextResponse.json({
      success: false,
      error: `Internal server error: ${error.message}`,
      timestamp,
    }, { status: 500 });
  }
}
