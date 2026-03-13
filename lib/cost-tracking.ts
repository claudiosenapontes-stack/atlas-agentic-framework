/**
 * Cost Tracking Utility
 * ATLAS-COST-MVP-357
 * 
 * Records execution costs and maintains rollup totals.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface CostRecordInput {
  execution_id?: string;
  task_id?: string;
  workflow_execution_id?: string;
  agent_id?: string;
  company_id?: string;
  model: string;
  tokens_input?: number;
  tokens_output?: number;
  total_cost_usd: number;
  cost_type?: "llm" | "embedding" | "image" | "tool";
}

/**
 * Record a cost entry for an execution
 */
export async function recordExecutionCost(input: CostRecordInput): Promise<{ success: boolean; cost_id?: string; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data, error } = await supabaseAdmin
    .from("execution_costs")
    // @ts-ignore - Table may not exist in types yet
    .insert({
      execution_id: input.execution_id,
      task_id: input.task_id,
      workflow_execution_id: input.workflow_execution_id,
      agent_id: input.agent_id,
      company_id: input.company_id,
      model: input.model,
      tokens_input: input.tokens_input ?? 0,
      tokens_output: input.tokens_output ?? 0,
      total_cost_usd: input.total_cost_usd,
      cost_type: input.cost_type ?? "llm",
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[CostTracking] Failed to record cost:", error);
    return { success: false, error: error.message };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: true, cost_id: (data as any)?.id };
}

/**
 * Record cost from execution completion data
 * This should be called when an execution completes
 */
export async function captureExecutionCost(params: {
  executionId: string;
  agentId: string;
  taskId?: string;
  workflowExecutionId?: string;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}): Promise<{ success: boolean; cost_id?: string; error?: string }> {
  // Get execution details for context
  const supabaseAdmin = getSupabaseAdmin();
  
  // Try to resolve company_id from task or execution context
  let companyId: string | null = null;
  
  if (params.taskId) {
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .select("company_id")
      .eq("id", params.taskId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companyId = (task as any)?.company_id ?? null;
  }

  if (!companyId && params.workflowExecutionId) {
    const { data: wfExec } = await supabaseAdmin
      .from("workflow_executions")
      .select("company_id")
      .eq("id", params.workflowExecutionId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companyId = (wfExec as any)?.company_id ?? null;
  }
  
  // Default model if not provided
  const model = params.model ?? "unknown";
  
  // Calculate cost if not provided (basic placeholder pricing)
  let costUsd = params.costUsd ?? 0;
  if (costUsd === 0 && params.tokensUsed) {
    costUsd = estimateCost(model, params.tokensUsed);
  }
  
  // Calculate input/output split if not provided
  let inputTokens = params.inputTokens ?? 0;
  let outputTokens = params.outputTokens ?? 0;
  
  if (inputTokens === 0 && outputTokens === 0 && params.tokensUsed) {
    // Assume 70% input, 30% output if not specified
    inputTokens = Math.floor(params.tokensUsed * 0.7);
    outputTokens = params.tokensUsed - inputTokens;
  }
  
  return recordExecutionCost({
    execution_id: params.executionId,
    task_id: params.taskId,
    workflow_execution_id: params.workflowExecutionId,
    agent_id: params.agentId,
    company_id: companyId ?? undefined,
    model,
    tokens_input: inputTokens,
    tokens_output: outputTokens,
    total_cost_usd: costUsd,
  });
}

/**
 * Estimate cost based on model and tokens
 * Uses approximate pricing - update with actual rates
 */
function estimateCost(model: string, tokens: number): number {
  const pricing: Record<string, number> = {
    "gpt-4": 0.00003,           // $0.03 per 1K tokens
    "gpt-4-turbo": 0.00001,     // $0.01 per 1K tokens
    "gpt-3.5-turbo": 0.0000005, // $0.0005 per 1K tokens
    "claude-3-opus": 0.000015,  // $0.015 per 1K tokens
    "claude-3-sonnet": 0.000003,// $0.003 per 1K tokens
    "claude-3-haiku": 0.00000025, // $0.00025 per 1K tokens
    "gemini-pro": 0.0000005,    // $0.0005 per 1K tokens
    "default": 0.00001,
  };
  
  const rate = pricing[model.toLowerCase()] ?? pricing["default"];
  return tokens * rate;
}

/**
 * Get cost summary for an execution
 */
export async function getExecutionCostSummary(executionId: string): Promise<{
  total_cost_usd: number;
  total_tokens: number;
  model_breakdown: Record<string, { tokens: number; cost: number }>;
}> {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data, error } = await supabaseAdmin
    .from("execution_costs")
    .select("model, tokens_input, tokens_output, total_tokens, total_cost_usd")
    .eq("execution_id", executionId);
  
  if (error || !data) {
    return { total_cost_usd: 0, total_tokens: 0, model_breakdown: {} };
  }
  
  const summary = {
    total_cost_usd: 0,
    total_tokens: 0,
    model_breakdown: {} as Record<string, { tokens: number; cost: number }>,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const entry of (data as any[])) {
    summary.total_cost_usd += Number(entry.total_cost_usd);
    summary.total_tokens += entry.total_tokens ?? ((entry.tokens_input ?? 0) + (entry.tokens_output ?? 0));

    if (!summary.model_breakdown[entry.model]) {
      summary.model_breakdown[entry.model] = { tokens: 0, cost: 0 };
    }
    summary.model_breakdown[entry.model].tokens += entry.total_tokens ?? ((entry.tokens_input ?? 0) + (entry.tokens_output ?? 0));
    summary.model_breakdown[entry.model].cost += Number(entry.total_cost_usd);
  }
  
  return summary;
}
