/**
 * Cost Reporting API Routes
 * ATLAS-COST-MVP-357
 * 
 * GET /api/costs/summary - Overall cost summary
 * GET /api/costs/agents - Cost by agent
 * GET /api/costs/workflows/:id - Cost for specific workflow
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/costs/summary
 * Overall cost summary with optional filters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse filters
  const companyId = searchParams.get("company_id");
  const agentId = searchParams.get("agent_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    // Build base query
    let query = supabaseAdmin.from("execution_costs").select("*");
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    if (agentId) {
      query = query.eq("agent_id", agentId);
    }
    
    if (startDate) {
      query = query.gte("created_at", startDate);
    } else {
      // Default to last N days
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte("created_at", since.toISOString());
    }
    
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    
    const { data: costs, error } = await query;
    
    if (error) {
      console.error("[Costs API] Query error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to query costs" },
        { status: 500 }
      );
    }
    
    // Calculate summary
    const summary = {
      total_cost_usd: 0,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      entry_count: costs?.length ?? 0,
      by_model: {} as Record<string, { cost: number; tokens: number; count: number }>,
      by_agent: {} as Record<string, { cost: number; tokens: number; count: number }>,
      by_day: {} as Record<string, { cost: number; tokens: number; count: number }>,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const entry of (costs as any[]) ?? []) {
      const cost = Number(entry.total_cost_usd);
      const tokens = entry.total_tokens ?? ((entry.tokens_input ?? 0) + (entry.tokens_output ?? 0));
      
      summary.total_cost_usd += cost;
      summary.total_tokens += tokens;
      summary.total_input_tokens += entry.tokens_input ?? 0;
      summary.total_output_tokens += entry.tokens_output ?? 0;
      
      // By model
      if (!summary.by_model[entry.model]) {
        summary.by_model[entry.model] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.by_model[entry.model].cost += cost;
      summary.by_model[entry.model].tokens += tokens;
      summary.by_model[entry.model].count += 1;
      
      // By agent
      const agentKey = entry.agent_id ?? "unknown";
      if (!summary.by_agent[agentKey]) {
        summary.by_agent[agentKey] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.by_agent[agentKey].cost += cost;
      summary.by_agent[agentKey].tokens += tokens;
      summary.by_agent[agentKey].count += 1;
      
      // By day
      const day = entry.created_at.split("T")[0];
      if (!summary.by_day[day]) {
        summary.by_day[day] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.by_day[day].cost += cost;
      summary.by_day[day].tokens += tokens;
      summary.by_day[day].count += 1;
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total_cost_usd: Number(summary.total_cost_usd.toFixed(8)),
        total_tokens: summary.total_tokens,
        total_input_tokens: summary.total_input_tokens,
        total_output_tokens: summary.total_output_tokens,
        entry_count: summary.entry_count,
        period_days: days,
      },
      breakdown: {
        by_model: summary.by_model,
        by_agent: summary.by_agent,
        by_day: summary.by_day,
      },
      filters: {
        company_id: companyId,
        agent_id: agentId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    
  } catch (error) {
    console.error("[Costs API] Exception:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
