import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { data: agents, error: dbError } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true });

    if (dbError) {
      console.error('[API /control/fleet] Supabase error:', dbError);
    }

    const enrichedAgents = (agents || []).map((agent: any) => ({
      ...agent,
      live_status: 'unknown',
      uptime: null,
      restarts: 0,
      cpu_percent: 0,
      memory_bytes: 0,
    }));

    const onlineCount = enrichedAgents.filter((a: any) => a.live_status === 'online').length;
    const totalCount = enrichedAgents.length;

    return NextResponse.json({
      success: true,
      agents: enrichedAgents,
      stats: {
        total: totalCount,
        online: onlineCount,
        offline: totalCount - onlineCount,
        health_percent: totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('[API /control/fleet] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
