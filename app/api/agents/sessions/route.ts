/**
 * ATLAS-AGENT-SESSIONS API (Schema-Aligned)
 * ATLAS-SEVERINO-SCHEMA-REFRESH
 * 
 * GET /api/agents/sessions
 * Returns: Agent session telemetry from agent_sessions table (with fallback)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = 'force-dynamic';

// Atlas agent mapping for consistent IDs
const ATLAS_AGENTS = [
  { id: 'henry', name: 'Henry', role: 'coordinator' },
  { id: 'severino', name: 'Severino', role: 'operations' },
  { id: 'olivia', name: 'Olivia', role: 'product' },
  { id: 'sophia', name: 'Sophia', role: 'growth' },
  { id: 'harvey', name: 'Harvey', role: 'legal' },
  { id: 'einstein', name: 'Einstein', role: 'research' },
  { id: 'optimus', name: 'Optimus', role: 'engineering' },
  { id: 'optimus-prime', name: 'Optimus Prime', role: 'architecture' },
];

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const agentIdFilter = searchParams.get('agentId');
    
    const supabase = getSupabaseAdmin();
    
    // Try primary source: agent_sessions table
    let sessions: any[] = [];
    let source = 'agent_sessions_table';
    let useFallback = false;
    
    try {
      const { data, error } = await (supabase as any)
        .from('agent_sessions')
        .select('*')
        .order('last_activity', { ascending: false });
      
      if (error) {
        console.log('[Agent Sessions] Table error:', error.message);
        useFallback = true;
      } else if (!data || data.length === 0) {
        console.log('[Agent Sessions] Table empty, using fallback');
        useFallback = true;
      } else {
        sessions = data;
      }
    } catch (tableError) {
      console.log('[Agent Sessions] Table exception:', tableError);
      useFallback = true;
    }
    
    // Fallback: Build sessions from worker_heartbeats
    if (useFallback && sessions.length === 0) {
      source = 'worker_heartbeats_fallback';
      
      try {
        const { data: heartbeats, error: hbError } = await (supabase as any)
          .from('worker_heartbeats')
          .select('worker_id, last_heartbeat_at, metadata, created_at')
          .order('last_heartbeat_at', { ascending: false });
        
        if (!hbError && heartbeats && heartbeats.length > 0) {
          // Group by worker_id (agent_id) and get most recent
          const latestByAgent: Record<string, any> = {};
          heartbeats.forEach((hb: any) => {
            const agentId = hb.worker_id;
            if (!latestByAgent[agentId] || new Date(hb.last_heartbeat_at) > new Date(latestByAgent[agentId].last_heartbeat_at)) {
              latestByAgent[agentId] = hb;
            }
          });
          
          // Map to session format
          sessions = Object.values(latestByAgent).map((hb: any) => {
            const metadata = hb.metadata || {};
            return {
              id: `${hb.worker_id}-session`,
              agent_id: hb.worker_id,
              session_start: hb.created_at || hb.last_heartbeat_at,
              last_activity: hb.last_heartbeat_at,
              context_tokens: metadata.context_tokens_used || metadata.context_tokens || 0,
              max_context: metadata.max_context_tokens || metadata.max_context || 262000,
              status: 'active',
              model: metadata.model || 'openrouter/moonshotai/kimi-k2.5',
              created_at: hb.created_at,
              updated_at: hb.last_heartbeat_at,
            };
          });
        } else if (hbError) {
          console.log('[Agent Sessions] Heartbeat error:', hbError);
        }
      } catch (hbError) {
        console.log('[Agent Sessions] Heartbeat exception:', hbError);
      }
    }
    
    // If still no data, generate from OpenClaw API
    if (sessions.length === 0) {
      try {
        const openclaw = getOpenClawClient();
        const activeAgents = await openclaw.getActiveAgents();
        
        if (activeAgents && activeAgents.length > 0) {
          source = 'openclaw_api';
          sessions = activeAgents.map((agent: any) => ({
            id: `${agent.id}-session`,
            agent_id: agent.id,
            session_start: agent.lastSeen || timestamp,
            last_activity: agent.lastSeen || timestamp,
            context_tokens: 0,
            max_context: 262000,
            status: agent.status === 'online' ? 'active' : 'idle',
            model: 'openrouter/moonshotai/kimi-k2.5',
            created_at: agent.lastSeen || timestamp,
            updated_at: agent.lastSeen || timestamp,
          }));
        }
      } catch (ocError) {
        console.log('[Agent Sessions] OpenClaw fallback failed:', ocError);
      }
    }
    
    // Final fallback: static agent list
    if (sessions.length === 0) {
      source = 'static_list';
      sessions = ATLAS_AGENTS.map(agent => ({
        id: `${agent.id}-session`,
        agent_id: agent.id,
        session_start: timestamp,
        last_activity: timestamp,
        context_tokens: 0,
        max_context: 262000,
        status: 'active',
        model: 'openrouter/moonshotai/kimi-k2.5',
        created_at: timestamp,
        updated_at: timestamp,
      }));
    }
    
    // Filter by agentId if specified
    if (agentIdFilter) {
      sessions = sessions.filter((s: any) => s.agent_id === agentIdFilter);
    }
    
    // Calculate session age and enhance data
    const now = new Date();
    const enhancedSessions = sessions.map((session: any) => {
      const sessionStart = new Date(session.session_start || session.created_at);
      const lastActivity = new Date(session.last_activity || session.updated_at);
      
      const sessionAgeMs = now.getTime() - sessionStart.getTime();
      const idleTimeMs = now.getTime() - lastActivity.getTime();
      
      // Format session age
      const sessionAgeMinutes = Math.floor(sessionAgeMs / (1000 * 60));
      const sessionAgeHours = Math.floor(sessionAgeMs / (1000 * 60 * 60));
      const sessionAgeDays = Math.floor(sessionAgeMs / (1000 * 60 * 60 * 24));
      
      let sessionAgeFormatted: string;
      if (sessionAgeDays > 0) {
        sessionAgeFormatted = `${sessionAgeDays}d ${sessionAgeHours % 24}h`;
      } else if (sessionAgeHours > 0) {
        sessionAgeFormatted = `${sessionAgeHours}h ${sessionAgeMinutes % 60}m`;
      } else {
        sessionAgeFormatted = `${sessionAgeMinutes}m`;
      }
      
      return {
        ...session,
        session_age_ms: sessionAgeMs,
        session_age_formatted: sessionAgeFormatted,
        idle_time_ms: idleTimeMs,
        idle_time_minutes: Math.floor(idleTimeMs / (1000 * 60)),
        context_utilization_pct: session.max_context > 0 
          ? Math.round(((session.context_tokens || 0) / session.max_context) * 100) 
          : 0,
      };
    });
    
    // Calculate summary stats
    const stats = {
      total_sessions: enhancedSessions.length,
      active_sessions: enhancedSessions.filter((s: any) => s.status === 'active').length,
      total_context_tokens: enhancedSessions.reduce((sum: number, s: any) => sum + (s.context_tokens || 0), 0),
      avg_context_utilization: enhancedSessions.length > 0
        ? Math.round(enhancedSessions.reduce((sum: number, s: any) => sum + (s.context_utilization_pct || 0), 0) / enhancedSessions.length)
        : 0,
    };
    
    return NextResponse.json({
      success: true,
      sessions: enhancedSessions,
      stats,
      timestamp,
      source,
    });
    
  } catch (error) {
    console.error('[Agent Sessions] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch agent sessions',
        sessions: [],
        stats: null,
        timestamp,
      },
      { status: 500 }
    );
  }
}
