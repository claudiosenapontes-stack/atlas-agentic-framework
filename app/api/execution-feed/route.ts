import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('executions')
      .select('id, agent_id, task_name, status, started_at, completed_at, duration_ms, output, error_message')
      .order('started_at', { ascending: false })
      .limit(limit);
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: executions, error } = await query;
    
    if (error) {
      console.error('Error fetching executions:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // Calculate stats
    const stats = {
      total: executions?.length || 0,
      completed: executions?.filter(e => e.status === 'completed').length || 0,
      failed: executions?.filter(e => e.status === 'failed').length || 0,
      running: executions?.filter(e => e.status === 'running').length || 0
    };
    
    return NextResponse.json({
      success: true,
      executions: executions || [],
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in execution-feed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { agent_id, task_name, status, output, duration_ms, error_message } = body;
    
    const { data, error } = await supabase
      .from('executions')
      .insert({
        agent_id,
        task_name,
        status,
        output,
        duration_ms,
        error_message,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, execution: data });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
