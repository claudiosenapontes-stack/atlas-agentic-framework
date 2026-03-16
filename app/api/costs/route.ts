/**
 * ATLAS-COSTS API (Production-Schema-Aligned)
 * Uses executions table (tokens_used, actual_cost_usd)
 * 
 * GET /api/costs
 * Returns: Real cost data from executions table
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month
    const agentId = searchParams.get('agentId');
    
    const supabase = getSupabaseAdmin();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }
    
    // Query executions table for cost data
    let query = (supabase as any)
      .from('executions')
      .select('id, agent_id, task_id, tokens_used, actual_cost_usd, created_at, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data: executions, error } = await query;
    
    if (error) {
      console.error('[Costs] Executions query error:', error);
      throw error;
    }
    
    // Filter to records with cost data
    const withCost = (executions || []).filter((e: any) => (e.tokens_used || 0) > 0);
    
    // Calculate totals
    const totals = {
      executionCount: withCost.length,
      totalTokens: withCost.reduce((sum: number, e: any) => sum + (e.tokens_used || 0), 0),
      totalCostUsd: withCost.reduce((sum: number, e: any) => sum + (e.actual_cost_usd || 0), 0),
    };
    
    // Group by date
    const byDate: Record<string, any> = {};
    for (const e of withCost) {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = {
          executionCount: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      byDate[date].executionCount++;
      byDate[date].totalTokens += e.tokens_used || 0;
      byDate[date].totalCostUsd += e.actual_cost_usd || 0;
    }
    
    // Group by agent (join with agents table for names)
    const { data: agents } = await (supabase as any)
      .from('agents')
      .select('id, name, display_name');
    
    const agentMap: Record<string, string> = {};
    (agents || []).forEach((a: any) => {
      agentMap[a.id] = a.name || a.display_name || a.id;
    });
    
    const byAgent: Record<string, any> = {};
    for (const e of withCost) {
      const id = e.agent_id || 'unknown';
      if (!byAgent[id]) {
        byAgent[id] = {
          agentId: id,
          agentName: agentMap[id] || id,
          executionCount: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      byAgent[id].executionCount++;
      byAgent[id].totalTokens += e.tokens_used || 0;
      byAgent[id].totalCostUsd += e.actual_cost_usd || 0;
    }
    
    // If no cost data, mark as PARTIAL
    if (withCost.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totals: { executionCount: 0, totalTokens: 0, totalCostUsd: 0 },
          byDate: {},
          byAgent: [],
          executions: [],
        },
        status: 'PARTIAL',
        message: 'No cost data recorded for this period',
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totals,
        byDate,
        byAgent: Object.values(byAgent),
        executions: withCost.slice(0, 100), // Limit to last 100
      },
      status: 'COMPLETE',
      source: 'executions_table',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Costs] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch costs',
        data: null,
        status: 'ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
