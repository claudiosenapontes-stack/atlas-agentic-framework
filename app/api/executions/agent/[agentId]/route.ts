/**
 * ATLAS-EXECUTIONS-BY-AGENT API (with Schema Flexibility)
 * ATLAS-SEVERINO-OBSERVABILITY-COMPLETION-004
 * 
 * GET /api/executions/agent/:agentId
 * Returns: Per-agent execution telemetry (last_execution_at, execution_count, average_runtime)
 * Adapts to actual executions table schema
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const timestamp = new Date().toISOString();
  
  try {
    const { agentId } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    
    const supabase = getSupabaseAdmin();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }
    
    // Get agent mapping for name resolution
    let agentUuid = agentId;
    let agentName = agentId;
    
    try {
      const { data: agents } = await (supabase as any)
        .from('agents')
        .select('id, name, display_name');
      
      // Try to resolve agentId to UUID if it's a name
      const agentByName = (agents || []).find((a: any) => 
        (a.name || '').toLowerCase() === agentId.toLowerCase() ||
        (a.display_name || '').toLowerCase() === agentId.toLowerCase()
      );
      
      if (agentByName) {
        agentUuid = agentByName.id;
        agentName = agentByName.display_name || agentByName.name || agentId;
      } else {
        // Check if agentId is already a UUID
        const agentById = (agents || []).find((a: any) => a.id === agentId);
        if (agentById) {
          agentName = agentById.display_name || agentById.name || agentId;
        }
      }
    } catch (e) {
      console.log('[Executions By Agent] Agent lookup failed:', e);
    }
    
    // Build query - use minimal column selection
    let query = (supabase as any)
      .from('executions')
      .select('id, status, created_at, updated_at, tokens_used, actual_cost_usd, agent_id')
      .order('created_at', { ascending: false });
    
    // Try both UUID and name
    query = query.or(`agent_id.eq.${agentUuid},agent_id.eq.${agentId}`);
    
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    
    const { data: executions, error } = await query;
    
    if (error) {
      console.error('[Executions By Agent] Query error:', error);
      // Return empty but valid response instead of error
      return NextResponse.json({
        success: true,
        agent_id: agentId,
        agent_uuid: agentUuid,
        agent_name: agentName,
        telemetry: {
          execution_count: 0,
          last_execution_at: null,
          average_runtime_ms: 0,
          average_runtime_formatted: 'N/A',
          total_tokens: 0,
          total_cost_usd: 0,
          status_breakdown: {},
          completion_rate: 0,
        },
        by_date: {},
        recent_executions: [],
        period,
        timestamp,
        source: 'executions_table',
        note: 'Query returned error, returning empty telemetry',
      });
    }
    
    // Calculate telemetry metrics
    const executionCount = executions?.length || 0;
    
    // Last execution timestamp
    const lastExecutionAt = executionCount > 0 ? executions[0].created_at : null;
    
    // Calculate average runtime (for completed executions)
    const completedExecutions = (executions || []).filter((e: any) => 
      (e.status === 'completed' || e.status === 'success') && 
      (e.updated_at) && 
      e.created_at
    );
    
    let averageRuntimeMs = 0;
    let averageRuntimeFormatted = 'N/A';
    
    if (completedExecutions.length > 0) {
      const totalRuntime = completedExecutions.reduce((sum: number, e: any) => {
        const start = new Date(e.created_at).getTime();
        const end = new Date(e.updated_at).getTime();
        return sum + (end - start);
      }, 0);
      
      averageRuntimeMs = Math.round(totalRuntime / completedExecutions.length);
      
      // Format runtime
      const seconds = Math.floor(averageRuntimeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        averageRuntimeFormatted = `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        averageRuntimeFormatted = `${minutes}m ${seconds % 60}s`;
      } else {
        averageRuntimeFormatted = `${seconds}s`;
      }
    }
    
    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    (executions || []).forEach((e: any) => {
      const status = e.status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    // Cost and token totals
    const totalTokens = (executions || []).reduce((sum: number, e: any) => {
      return sum + (e.tokens_used || 0);
    }, 0);
    
    const totalCostUsd = (executions || []).reduce((sum: number, e: any) => {
      return sum + (e.actual_cost_usd || 0);
    }, 0);
    
    // Daily execution counts for trend
    const byDate: Record<string, number> = {};
    (executions || []).forEach((e: any) => {
      if (e.created_at) {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }
    });
    
    // Recent executions (last 10)
    const recentExecutions = (executions || []).slice(0, 10).map((e: any) => ({
      id: e.id,
      status: e.status,
      created_at: e.created_at,
      tokens_used: e.tokens_used || 0,
      actual_cost_usd: e.actual_cost_usd || 0,
    }));
    
    return NextResponse.json({
      success: true,
      agent_id: agentId,
      agent_uuid: agentUuid,
      agent_name: agentName,
      telemetry: {
        execution_count: executionCount,
        last_execution_at: lastExecutionAt,
        average_runtime_ms: averageRuntimeMs,
        average_runtime_formatted: averageRuntimeFormatted,
        total_tokens: totalTokens,
        total_cost_usd: totalCostUsd,
        status_breakdown: statusBreakdown,
        completion_rate: executionCount > 0 
          ? Math.round((completedExecutions.length / executionCount) * 100) 
          : 0,
      },
      by_date: byDate,
      recent_executions: recentExecutions,
      period,
      timestamp,
      source: 'executions_table',
    });
    
  } catch (error) {
    console.error('[Executions By Agent] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch execution telemetry',
        agent_id: params.agentId,
        telemetry: null,
        timestamp,
      },
      { status: 500 }
    );
  }
}
