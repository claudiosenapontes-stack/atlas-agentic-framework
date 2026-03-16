/**
 * ATLAS-WORKER-HEARTBEATS API (Production-Schema-Aligned)
 * Uses worker_heartbeats.worker_id (NOT agent_id)
 * 
 * POST /api/workers/heartbeat
 * GET /api/workers/heartbeat
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// POST /api/workers/heartbeat - Record a worker heartbeat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      worker_id,  // This maps to agents.name for Atlas agents
      worker_type = 'agent',
      status = 'healthy',
      cpu_percent,
      memory_mb,
      uptime_seconds,
      current_execution_id,
      session_id,
      metadata,
    } = body;
    
    if (!worker_id) {
      return NextResponse.json(
        { success: false, error: 'worker_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check if table exists by trying a simple query
    const { error: checkError } = await (supabase as any)
      .from('worker_heartbeats')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.message?.includes('does not exist')) {
      return NextResponse.json(
        { success: false, error: 'worker_heartbeats table not found', status: 'UNAVAILABLE' },
        { status: 503 }
      );
    }
    
    // Use actual production schema: worker_id, last_heartbeat_at, expires_at
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min expiry
    
    const { error } = await (supabase as any)
      .from('worker_heartbeats')
      .insert({
        id: randomUUID(),
        worker_id,  // NOT agent_id - this is the production schema
        worker_type,
        status,
        cpu_percent,
        memory_mb,
        uptime_seconds,
        current_execution_id,
        session_id,
        metadata,
        last_heartbeat_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      worker_id,
      recorded_at: now.toISOString(),
    });
    
  } catch (error) {
    console.error('[Worker Heartbeat] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record heartbeat',
      },
      { status: 500 }
    );
  }
}

// GET /api/workers/heartbeat - Get worker health status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('worker_id');
    const staleThreshold = parseInt(searchParams.get('stale_seconds') || '300'); // 5 min default
    
    const supabase = getSupabaseAdmin();
    
    // Check if table exists
    const { error: checkError } = await (supabase as any)
      .from('worker_heartbeats')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'worker_heartbeats table not found', 
          status: 'UNAVAILABLE',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
    
    // Calculate stale threshold
    const staleTime = new Date(Date.now() - staleThreshold * 1000).toISOString();
    
    // Query using production schema: worker_id, last_heartbeat_at
    let query = (supabase as any)
      .from('worker_heartbeats')
      .select('*')
      .order('last_heartbeat_at', { ascending: false });
    
    if (workerId) {
      query = query.eq('worker_id', workerId);  // NOT agent_id
    } else {
      query = query.limit(100);
    }
    
    const { data: heartbeats, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Get unique latest heartbeats per worker (using worker_id)
    const latestByWorker: Record<string, any> = {};
    for (const hb of heartbeats || []) {
      if (!latestByWorker[hb.worker_id] || 
          new Date(hb.last_heartbeat_at) > new Date(latestByWorker[hb.worker_id].last_heartbeat_at)) {
        latestByWorker[hb.worker_id] = hb;
      }
    }
    
    // Join with agents table to get agent names
    const { data: agents } = await (supabase as any)
      .from('agents')
      .select('name, display_name');
    
    const agentNames: Record<string, string> = {};
    (agents || []).forEach((a: any) => {
      agentNames[a.name] = a.display_name || a.name;
    });
    
    const workers = Object.values(latestByWorker).map((hb: any) => ({
      worker_id: hb.worker_id,
      agent_name: agentNames[hb.worker_id] || hb.worker_id,
      worker_type: hb.worker_type,
      status: new Date(hb.last_heartbeat_at) < new Date(staleTime) ? 'stale' : hb.status,
      cpu_percent: hb.cpu_percent,
      memory_mb: hb.memory_mb,
      uptime_seconds: hb.uptime_seconds,
      current_execution_id: hb.current_execution_id,
      session_id: hb.session_id,
      last_heartbeat: hb.last_heartbeat_at,
      expires_at: hb.expires_at,
      is_stale: new Date(hb.last_heartbeat_at) < new Date(staleTime),
      is_expired: hb.expires_at ? new Date(hb.expires_at) < new Date() : false,
    }));
    
    const stats = {
      total: workers.length,
      healthy: workers.filter((w: any) => w.status === 'active' && !w.is_stale).length,
      degraded: workers.filter((w: any) => w.status === 'degraded').length,
      unhealthy: workers.filter((w: any) => w.status === 'unhealthy').length,
      stale: workers.filter((w: any) => w.is_stale).length,
      expired: workers.filter((w: any) => w.is_expired).length,
    };
    
    return NextResponse.json({
      success: true,
      workers,
      stats,
      stale_threshold_seconds: staleThreshold,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Worker Health] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get worker health',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
