/**
 * GET /api/costs/workflows/:id
 * Cost details for a specific workflow execution
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workflowExecutionId = params.id;
  
  if (!workflowExecutionId) {
    return NextResponse.json(
      { success: false, error: "Workflow execution ID is required" },
      { status: 400 }
    );
  }
  
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    // Get workflow execution details
    const { data: workflowExec, error: wfError } = await supabaseAdmin
      .from("workflow_executions")
      .select("*, workflow:workflow_id(name)")
      .eq("id", workflowExecutionId)
      .single();
    
    if (wfError || !workflowExec) {
      return NextResponse.json(
        { success: false, error: "Workflow execution not found" },
        { status: 404 }
      );
    }
    
    // Get cost entries for this workflow
    const { data: costs, error: costsError } = await supabaseAdmin
      .from("execution_costs")
      .select("*")
      .eq("workflow_execution_id", workflowExecutionId)
      .order("created_at", { ascending: true });
    
    if (costsError) {
      console.error("[Costs Workflow API] Error:", costsError);
    }
    
    // Calculate summary
    const summary = {
      total_cost_usd: 0,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      entry_count: costs?.length ?? 0,
    };
    
    const byTask: Record<string, { cost: number; tokens: number; task_id: string }> = {};
    const byAgent: Record<string, { cost: number; tokens: number; agent_id: string }> = {};
    const byModel: Record<string, { cost: number; tokens: number; count: number }> = {};
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const entry of (costs as any[]) ?? []) {
      const cost = Number(entry.total_cost_usd);
      const tokens = entry.total_tokens ?? ((entry.tokens_input ?? 0) + (entry.tokens_output ?? 0));
      
      summary.total_cost_usd += cost;
      summary.total_tokens += tokens;
      summary.total_input_tokens += entry.tokens_input ?? 0;
      summary.total_output_tokens += entry.tokens_output ?? 0;
      
      // By task
      if (entry.task_id) {
        if (!byTask[entry.task_id]) {
          byTask[entry.task_id] = { cost: 0, tokens: 0, task_id: entry.task_id };
        }
        byTask[entry.task_id].cost += cost;
        byTask[entry.task_id].tokens += tokens;
      }
      
      // By agent
      if (entry.agent_id) {
        if (!byAgent[entry.agent_id]) {
          byAgent[entry.agent_id] = { cost: 0, tokens: 0, agent_id: entry.agent_id };
        }
        byAgent[entry.agent_id].cost += cost;
        byAgent[entry.agent_id].tokens += tokens;
      }
      
      // By model
      if (!byModel[entry.model]) {
        byModel[entry.model] = { cost: 0, tokens: 0, count: 0 };
      }
      byModel[entry.model].cost += cost;
      byModel[entry.model].tokens += tokens;
      byModel[entry.model].count += 1;
    }
    
    return NextResponse.json({
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow_execution: {
        id: (workflowExec as any).id,
        workflow_name: (workflowExec as any).workflow?.name ?? "Unknown",
        status: (workflowExec as any).status,
        started_at: (workflowExec as any).started_at,
        completed_at: (workflowExec as any).completed_at,
      },
      cost: {
        total_cost_usd: Number(summary.total_cost_usd.toFixed(8)),
        total_tokens: summary.total_tokens,
        total_input_tokens: summary.total_input_tokens,
        total_output_tokens: summary.total_output_tokens,
        entry_count: summary.entry_count,
        cost_per_task: Object.values(byTask),
        cost_per_agent: Object.values(byAgent),
        cost_per_model: byModel,
      },
      entries: (costs as any[])?.map((c: any) => ({
        id: c.id,
        model: c.model,
        tokens_input: c.tokens_input,
        tokens_output: c.tokens_output,
        total_tokens: c.total_tokens,
        total_cost_usd: Number(c.total_cost_usd),
        created_at: c.created_at,
      })),
    });
    
  } catch (error) {
    console.error("[Costs Workflow API] Exception:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
