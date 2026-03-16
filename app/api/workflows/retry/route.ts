/**
 * POST /api/workflows/retry
 * 
 * Retry failed or stuck workflow executions.
 * Called by scheduled worker (e.g., every 5 minutes via cron).
 * 
 * ATLAS-HOT-LEAD-WORKFLOW-M1-1099
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { WorkflowEngine } from "@/lib/workflow-engine";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    // Parse options
    const body = await request.json().catch(() => ({}));
    const { 
      limit = 10,           // Max executions to retry
      workflowName = null,  // Filter by workflow name
      specificExecutionId = null // Retry specific execution
    } = body;

    let executionsToRetry = [];

    if (specificExecutionId) {
      // Retry specific execution
      const { data } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', specificExecutionId)
        .single();
      
      if (data) executionsToRetry = [data];
    } else {
      // Find failed/retrying workflows due for retry
      let query = supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow:workflow_definitions(name)
        `)
        .in('status', ['failed', 'retrying'])
        .or('retry_at.is.null,retry_at.lte.' + new Date().toISOString())
        .lt('attempt_number', 'max_attempts')
        .limit(limit);
      
      if (workflowName) {
        query = query.eq('workflow.name', workflowName);
      }
      
      const { data } = await query;
      executionsToRetry = data || [];
    }

    const results = [];
    
    for (const execution of executionsToRetry as any[]) {
      try {
        // Check if still eligible for retry
        if (execution.attempt_number >= execution.max_attempts) {
          await supabase
            .from('workflow_executions')
            .update({ status: 'dead_letter' })
            .eq('id', execution.id);
          
          results.push({
            execution_id: execution.id,
            status: 'dead_letter',
            reason: 'max_attempts_exceeded'
          });
          continue;
        }

        // Increment attempt number and update status
        const newAttemptNumber = execution.attempt_number + 1;
        await supabase
          .from('workflow_executions')
          .update({
            status: 'running',
            attempt_number: newAttemptNumber,
            retry_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        // Re-run with same config
        const engine = new WorkflowEngine({
          workflowName: execution.trigger_event_type,
          companyId: execution.company_id,
          idempotencyKey: execution.idempotency_key,
          triggerEvent: {
            id: execution.trigger_event_id,
            type: execution.trigger_event_type,
            payload: execution.trigger_payload
          }
        });
        
        const result = await engine.execute();
        
        results.push({
          execution_id: execution.id,
          status: result.status,
          idempotent: result.idempotent,
          output: result.output
        });
        
      } catch (error) {
        // Update retry schedule
        const nextRetryAt = new Date(Date.now() + (5000 * execution.attempt_number));
        
        await supabase
          .from('workflow_executions')
          .update({
            status: 'retrying',
            retry_at: nextRetryAt.toISOString(),
            error_message: error instanceof Error ? error.message : String(error),
            updated_at: new Date().toISOString()
          })
          .eq('id', execution.id);
        
        results.push({
          execution_id: execution.id,
          status: 'retry_scheduled',
          retry_at: nextRetryAt.toISOString(),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('[workflows/retry] Exception:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Retry processing failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/retry
 * 
 * Get pending retry queue status
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    // Count by status using separate queries (avoid .group() which isn't supported)
    const statusCounts: Record<string, number> = {};
    for (const status of ['failed', 'retrying', 'running']) {
      const { count } = await supabase
        .from('workflow_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      statusCounts[status] = count || 0;
    }
    const counts = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    
    // Get upcoming retries
    const { data: upcoming } = await supabase
      .from('workflow_executions')
      .select('id, company_id, retry_at, attempt_number, max_attempts')
      .eq('status', 'retrying')
      .order('retry_at', { ascending: true })
      .limit(10);
    
    return NextResponse.json({
      counts: counts || [],
      upcoming_retries: upcoming || [],
      now: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500 }
    );
  }
}
