/**
 * POST /api/events/lead-scored-hot
 * 
 * Event-driven workflow trigger for hot lead follow-up.
 * 
 * ATLAS-HOT-LEAD-WORKFLOW-M1-1099
 * 
 * Features:
 * - Idempotent execution (prevents duplicate tasks/notifications)
 * - Retry-safe with step-level traceability
 * - Company-scoped with owner assignment rules
 * - Exactly-once task creation
 * - Exactly-once notification delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflow-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Required fields
    const { 
      event_id,      // UUID of the scoring event
      lead_id,       // UUID of the lead
      company_id,    // UUID of the company
      score,         // Numeric score (must be >= 80 for hot)
      previous_score,
      scored_at,
      scoring_factors,
      // Optional lead data
      lead_name,
      lead_email,
      lead_phone
    } = body;

    // Validation
    if (!event_id || !lead_id || !company_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: event_id, lead_id, company_id" 
        },
        { status: 400 }
      );
    }

    // Build idempotency key: one execution per lead per day
    const eventDate = scored_at 
      ? scored_at.split('T')[0] 
      : new Date().toISOString().split('T')[0];
    const idempotencyKey = `${company_id}:${lead_id}:hot_lead:${eventDate}`;

    // Initialize workflow engine
    const engine = new WorkflowEngine({
      workflowName: 'hot_lead_followup',
      companyId: company_id,
      idempotencyKey,
      triggerEvent: {
        id: event_id,
        type: 'lead_scored_hot',
        payload: {
          lead_id,
          company_id,
          score,
          previous_score,
          scored_at,
          scoring_factors,
          lead_name,
          lead_email,
          lead_phone
        }
      }
    });

    // Execute workflow
    const result = await engine.execute();
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 500 
    });

  } catch (error) {
    console.error('[lead-scored-hot] Exception:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/lead-scored-hot
 * 
 * Query workflow execution status by idempotency key or execution ID
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const executionId = searchParams.get('execution_id');
  const leadId = searchParams.get('lead_id');
  const companyId = searchParams.get('company_id');
  const date = searchParams.get('date');
  
  if (!executionId && !(leadId && companyId)) {
    return NextResponse.json(
      { error: "Provide execution_id OR lead_id + company_id" },
      { status: 400 }
    );
  }
  
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        steps:workflow_step_events(*)
      `);
    
    if (executionId) {
      query = query.eq('id', executionId);
    } else {
      const eventDate = date || new Date().toISOString().split('T')[0];
      const idempotencyKey = `${companyId}:${leadId}:hot_lead:${eventDate}`;
      query = query.eq('idempotency_key', idempotencyKey);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, execution: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500 }
    );
  }
}
