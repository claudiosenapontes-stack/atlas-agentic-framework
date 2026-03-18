import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const calendarId = searchParams.get('calendar');
  const limit = parseInt(searchParams.get('limit') || '50');
  const startFrom = searchParams.get('from');
  const startTo = searchParams.get('to');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true })
      .limit(limit);

    if (calendarId) {
      query = query.eq('calendar_id', calendarId);
    }

    if (startFrom) {
      query = query.gte('start_time', startFrom);
    }

    if (startTo) {
      query = query.lte('start_time', startTo);
    }

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Calendar events fetch error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
