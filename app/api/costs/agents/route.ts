/**
 * GET /api/costs/agents
 * Cost summary by agent
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    // Use the cost_by_agent view
    const { data: agentCosts, error } = await supabaseAdmin
      .from("cost_by_agent")
      .select("*");
    
    if (error) {
      console.error("[Costs Agents API] Error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch agent costs" },
        { status: 500 }
      );
    }
    
    // Get detailed breakdown per agent
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("agents")
      .select("id, name, total_cost_usd, total_tokens_used");
    
    if (agentsError) {
      console.error("[Costs Agents API] Agents error:", agentsError);
    }
    
    // Calculate totals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalCost = (agentCosts as any[])?.reduce((sum: number, a: any) => sum + Number(a.total_cost_usd), 0) ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalTokens = (agentCosts as any[])?.reduce((sum: number, a: any) => sum + (a.total_tokens ?? 0), 0) ?? 0;
    
    return NextResponse.json({
      success: true,
      summary: {
        total_cost_usd: Number(totalCost.toFixed(8)),
        total_tokens: totalTokens,
        agent_count: agentCosts?.length ?? 0,
      },
      agents: (agentCosts as any[])?.map((agent: any) => ({
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        total_cost_usd: Number(Number(agent.total_cost_usd).toFixed(8)),
        total_tokens: agent.total_tokens,
        total_input_tokens: agent.total_input_tokens,
        total_output_tokens: agent.total_output_tokens,
        call_count: agent.call_count,
        models_used: agent.models_used,
      })) ?? [],
    });
    
  } catch (error) {
    console.error("[Costs Agents API] Exception:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
