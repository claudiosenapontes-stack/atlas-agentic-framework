/**
 * ATLAS-COSTS-SUMMARY API
 * ATLAS-SEVERINO-OBSERVABILITY-PATCH-001
 * 
 * GET /api/costs/summary
 * Returns: Cost analytics (daily_costs, monthly_costs, cost_by_agent, token_usage_by_agent)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 1d, 7d, 30d, 90d, all
    
    const supabase = getSupabaseAdmin();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Get agent mapping for names
    const { data: agents } = await (supabase as any)
      .from('agents')
      .select('id, name, display_name');
    
    const agentMap: Record<string, string> = {};
    (agents || []).forEach((a: any) => {
      agentMap[a.id] = a.display_name || a.name || a.id;
    });
    
    // Fetch daily costs
    const { data: dailyCosts, error: dailyError } = await (supabase as any)
      .from('daily_costs')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (dailyError) {
      console.error('[Costs Summary] Daily costs error:', dailyError);
    }
    
    // Fetch monthly costs
    const { data: monthlyCosts, error: monthlyError } = await (supabase as any)
      .from('monthly_costs')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (monthlyError) {
      console.error('[Costs Summary] Monthly costs error:', monthlyError);
    }
    
    // Aggregate cost by agent from executions table (source of truth)
    const { data: executionCosts, error: execError } = await (supabase as any)
      .from('executions')
      .select('agent_id, tokens_used, actual_cost_usd')
      .gte('created_at', startDate.toISOString())
      .not('tokens_used', 'is', null);
    
    if (execError) {
      console.error('[Costs Summary] Executions query error:', execError);
    }
    
    // Calculate cost by agent
    const costByAgentMap: Record<string, any> = {};
    (executionCosts || []).forEach((e: any) => {
      const agentId = e.agent_id || 'unknown';
      if (!costByAgentMap[agentId]) {
        costByAgentMap[agentId] = {
          agent_id: agentId,
          agent_name: agentMap[agentId] || agentId,
          execution_count: 0,
          total_tokens: 0,
          total_cost_usd: 0,
        };
      }
      costByAgentMap[agentId].execution_count++;
      costByAgentMap[agentId].total_tokens += e.tokens_used || 0;
      costByAgentMap[agentId].total_cost_usd += e.actual_cost_usd || 0;
    });
    
    const costByAgent = Object.values(costByAgentMap).sort(
      (a: any, b: any) => b.total_cost_usd - a.total_cost_usd
    );
    
    // Calculate token usage by agent
    const tokenUsageByAgent = Object.values(costByAgentMap).map((a: any) => ({
      agent_id: a.agent_id,
      agent_name: a.agent_name,
      total_tokens: a.total_tokens,
      avg_tokens_per_execution: a.execution_count > 0 
        ? Math.round(a.total_tokens / a.execution_count) 
        : 0,
    })).sort((a: any, b: any) => b.total_tokens - a.total_tokens);
    
    // Calculate totals
    const totalCost = Object.values(costByAgentMap).reduce(
      (sum: number, a: any) => sum + a.total_cost_usd, 0
    );
    const totalTokens = Object.values(costByAgentMap).reduce(
      (sum: number, a: any) => sum + a.total_tokens, 0
    );
    const totalExecutions = Object.values(costByAgentMap).reduce(
      (sum: number, a: any) => sum + a.execution_count, 0
    );
    
    // Calculate daily trend from daily_costs or executions
    const dailyTrend: Record<string, any> = {};
    (dailyCosts || []).forEach((d: any) => {
      dailyTrend[d.date] = {
        date: d.date,
        cost_usd: d.total_cost_usd,
        tokens: d.total_tokens,
        executions: d.execution_count,
      };
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        period,
        total_cost_usd: totalCost,
        total_tokens: totalTokens,
        total_executions: totalExecutions,
        avg_cost_per_execution: totalExecutions > 0 ? totalCost / totalExecutions : 0,
        avg_tokens_per_execution: totalExecutions > 0 ? Math.round(totalTokens / totalExecutions) : 0,
      },
      daily_costs: dailyCosts || [],
      monthly_costs: monthlyCosts || [],
      cost_by_agent: costByAgent,
      token_usage_by_agent: tokenUsageByAgent,
      daily_trend: Object.values(dailyTrend),
      timestamp,
      sources: {
        daily_costs: dailyError ? 'error' : 'daily_costs_table',
        monthly_costs: monthlyError ? 'error' : 'monthly_costs_table',
        cost_by_agent: execError ? 'error' : 'executions_table',
      },
    });
    
  } catch (error) {
    console.error('[Costs Summary] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch cost summary',
        summary: null,
        timestamp,
      },
      { status: 500 }
    );
  }
}
