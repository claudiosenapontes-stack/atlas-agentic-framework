import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

/**
 * POST /api/events/lead-scored-hot
 * 
 * Phase 4 Hot Lead Event Endpoint
 * Triggers hot lead workflow with lead scoring, SLA tracking, and attribution
 * 
 * Body: {
 *   lead_id: string (UUID),
 *   company_id?: string (UUID),
 *   score: number (0-100),
 *   score_components?: {
 *     demographic: number,
 *     behavioral: number,
 *     engagement: number,
 *     fit: number
 *   },
 *   lead_data: {
 *     name: string,
 *     email: string,
 *     phone?: string,
 *     source?: string,
 *     campaign_id?: string,
 *     campaign_name?: string
 *   },
 *   attribution?: {
 *     utm_source?: string,
 *     utm_medium?: string,
 *     utm_campaign?: string,
 *     touchpoint_type?: string,
 *     channel?: string
 *   },
 *   signals?: object
 * }
 */

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const eventId = randomUUID();
  
  try {
    const body = await request.json();
    const {
      lead_id,
      company_id,
      score,
      score_components,
      lead_data,
      attribution,
      signals
    } = body;

    // Validation
    if (!lead_id) {
      return NextResponse.json(
        { success: false, error: 'lead_id is required' },
        { status: 400 }
      );
    }

    if (!lead_data || !lead_data.name || !lead_data.email) {
      return NextResponse.json(
        { success: false, error: 'lead_data with name and email is required' },
        { status: 400 }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json(
        { success: false, error: 'score must be a number between 0-100' },
        { status: 400 }
      );
    }

    const resolvedCompanyId = company_id || (await getDefaultCompanyId(supabase));
    const isHot = score >= 80;

    // Step 1: Record lead score
    const { data: leadScore, error: scoreError } = await (supabase as any)
      .from('lead_scores')
      .insert({
        lead_id: lead_id,
        company_id: resolvedCompanyId,
        score: score,
        demographic_score: score_components?.demographic || 0,
        behavioral_score: score_components?.behavioral || 0,
        engagement_score: score_components?.engagement || 0,
        fit_score: score_components?.fit || 0,
        is_hot: isHot,
        threshold_reached_at: isHot ? new Date().toISOString() : null,
        signals: signals || {},
        scored_by: 'api'
      })
      .select()
      .single();

    if (scoreError) {
      console.error('[LeadScoredHot] Failed to record lead score:', scoreError);
      throw scoreError;
    }

    // Step 2: Record attribution touchpoint if provided
    if (attribution) {
      await (supabase as any).from('attribution_touchpoints').insert({
        lead_id: lead_id,
        company_id: resolvedCompanyId,
        touchpoint_type: attribution.touchpoint_type || 'api_event',
        channel: attribution.channel || attribution.utm_medium,
        campaign_id: lead_data.campaign_id,
        campaign_name: lead_data.campaign_name,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        engagement_value: score,
        touched_at: new Date().toISOString()
      });
    }

    // Step 3: Create workflow event
    const workflowEventPayload = {
      event_id: eventId,
      lead_id: lead_id,
      company_id: resolvedCompanyId,
      score: score,
      is_hot: isHot,
      lead_name: lead_data.name,
      lead_email: lead_data.email,
      lead_phone: lead_data.phone,
      source: lead_data.source,
      attribution: attribution || {},
      scored_at: new Date().toISOString()
    };

    const { data: workflowEvent, error: eventError } = await (supabase as any)
      .from('workflow_events')
      .insert({
        company_id: resolvedCompanyId,
        event_type: 'lead_scored_hot',
        event_subtype: isHot ? 'hot_threshold' : 'standard',
        source: 'lead_score',
        source_id: leadScore.id,
        payload: workflowEventPayload,
        idempotency_key: `lead_scored_hot:${lead_id}:${Date.now()}`
      })
      .select()
      .single();

    if (eventError) {
      console.error('[LeadScoredHot] Failed to create workflow event:', eventError);
      throw eventError;
    }

    // Step 4: Trigger workflow if hot lead
    let workflowExecution = null;
    if (isHot) {
      workflowExecution = await triggerHotLeadWorkflow(
        supabase,
        resolvedCompanyId,
        workflowEvent.id,
        workflowEventPayload
      );
    }

    return NextResponse.json({
      success: true,
      event_id: eventId,
      lead_score_id: leadScore.id,
      workflow_event_id: workflowEvent.id,
      is_hot: isHot,
      score: score,
      workflow_triggered: isHot,
      workflow_execution_id: workflowExecution?.id || null
    });

  } catch (error) {
    console.error('[LeadScoredHot] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        event_id: eventId
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger hot lead workflow execution
 */
async function triggerHotLeadWorkflow(
  supabase: any,
  companyId: string,
  eventId: string,
  payload: any
) {
  // Get workflow definition
  const { data: workflowDef } = await (supabase as any)
    .from('workflow_definitions')
    .select('id, config')
    .eq('event_trigger', 'lead_scored_hot')
    .eq('is_active', true)
    .maybeSingle();

  if (!workflowDef) {
    console.warn('[LeadScoredHot] No active workflow found for lead_scored_hot');
    return null;
  }

  // Create idempotency key
  const idempotencyKey = `hot_lead:${payload.lead_id}:${new Date().toISOString().split('T')[0]}`;

  // Check for existing execution (dedup window)
  const { data: existingExec } = await (supabase as any)
    .from('workflow_executions')
    .select('id, status, created_at')
    .eq('idempotency_key', idempotencyKey)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (existingExec) {
    console.log('[LeadScoredHot] Dedup: Existing workflow execution found:', existingExec.id);
    return existingExec;
  }

  // Create workflow execution
  const { data: execution, error: execError } = await (supabase as any)
    .from('workflow_executions')
    .insert({
      workflow_id: workflowDef.id,
      company_id: companyId,
      idempotency_key: idempotencyKey,
      trigger_event_id: eventId,
      trigger_event_type: 'lead_scored_hot',
      trigger_payload: payload,
      status: 'running'
    })
    .select()
    .single();

  if (execError) {
    console.error('[LeadScoredHot] Failed to create workflow execution:', execError);
    throw execError;
  }

  // Create workflow step events
  const steps = [
    { name: 'validate_lead', order: 1 },
    { name: 'assign_owner', order: 2 },
    { name: 'create_task', order: 3 },
    { name: 'send_notification', order: 4 },
    { name: 'start_sla_tracking', order: 5 }
  ];

  for (const step of steps) {
    await (supabase as any).from('workflow_step_events').insert({
      workflow_execution_id: execution.id,
      company_id: companyId,
      step_name: step.name,
      step_order: step.order,
      status: step.order === 1 ? 'running' : 'pending'
    });
  }

  // Step 1: Validate lead (immediate)
  await processValidateLead(supabase, execution.id, companyId, payload);

  // Step 2: Assign owner
  await processAssignOwner(supabase, execution.id, companyId, workflowDef.config, payload);

  // Step 3: Create task
  const task = await processCreateTask(supabase, execution.id, companyId, workflowDef.config, payload);

  // Step 4: Start SLA tracking
  if (task) {
    await processStartSLATracking(supabase, execution.id, companyId, task.id, payload);
  }

  // Mark execution as completed
  await (supabase as any)
    .from('workflow_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output: {
        task_id: task?.id,
        assigned_to: task?.assigned_to
      }
    })
    .eq('id', execution.id);

  // Mark all steps as completed
  await (supabase as any)
    .from('workflow_step_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('workflow_execution_id', execution.id);

  return execution;
}

/**
 * Process validate lead step
 */
async function processValidateLead(
  supabase: any,
  executionId: string,
  companyId: string,
  payload: any
) {
  const isValid = payload.lead_email && payload.lead_name;
  
  await (supabase as any)
    .from('workflow_step_events')
    .update({
      status: isValid ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      output_snapshot: { valid: isValid, email: payload.lead_email }
    })
    .eq('workflow_execution_id', executionId)
    .eq('step_name', 'validate_lead');

  return isValid;
}

/**
 * Process assign owner step
 */
async function processAssignOwner(
  supabase: any,
  executionId: string,
  companyId: string,
  config: any,
  payload: any
) {
  // Simple round-robin assignment (can be enhanced with team logic)
  const { data: agents } = await (supabase as any)
    .from('agents')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .limit(10);

  const assignedTo = agents && agents.length > 0
    ? agents[Math.floor(Math.random() * agents.length)].id
    : null;

  await (supabase as any)
    .from('workflow_step_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_snapshot: { assigned_to: assignedTo, strategy: config?.owner_assignment?.strategy || 'round_robin' }
    })
    .eq('workflow_execution_id', executionId)
    .eq('step_name', 'assign_owner');

  return assignedTo;
}

/**
 * Process create task step
 */
async function processCreateTask(
  supabase: any,
  executionId: string,
  companyId: string,
  config: any,
  payload: any
) {
  const taskConfig = config?.task_template || {
    title: 'Hot Lead Follow-up',
    priority: 'high',
    due_hours: 4
  };

  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + (taskConfig.due_hours || 4));

  const { data: task, error } = await (supabase as any)
    .from('tasks')
    .insert({
      company_id: companyId,
      title: taskConfig.title.replace('{{lead_name}}', payload.lead_name),
      description: `Hot lead follow-up for ${payload.lead_name} (${payload.lead_email})\n\nScore: ${payload.score}\nSource: ${payload.source || 'unknown'}`,
      priority: taskConfig.priority || 'high',
      due_date: dueDate.toISOString(),
      status: 'inbox',
      source: 'workflow',
      source_id: executionId,
      metadata: {
        lead_id: payload.lead_id,
        lead_email: payload.lead_email,
        lead_phone: payload.lead_phone,
        score: payload.score
      }
    })
    .select()
    .single();

  if (error) {
    console.error('[LeadScoredHot] Failed to create task:', error);
    throw error;
  }

  await (supabase as any)
    .from('workflow_step_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_snapshot: { task_id: task.id, title: task.title }
    })
    .eq('workflow_execution_id', executionId)
    .eq('step_name', 'create_task');

  return task;
}

/**
 * Process start SLA tracking step
 */
async function processStartSLATracking(
  supabase: any,
  executionId: string,
  companyId: string,
  taskId: string,
  payload: any
) {
  // Get SLA policy
  const { data: slaPolicy } = await (supabase as any)
    .from('sla_policies')
    .select('id, priority_config')
    .eq('is_active', true)
    .maybeSingle();

  const priorityConfig = slaPolicy?.priority_config?.hot || { response_minutes: 15, resolution_hours: 4 };

  const targetResponse = new Date();
  targetResponse.setMinutes(targetResponse.getMinutes() + priorityConfig.response_minutes);

  const targetResolution = new Date();
  targetResolution.setHours(targetResolution.getHours() + priorityConfig.resolution_hours);

  const { data: slaTracking, error } = await (supabase as any)
    .from('sla_tracking')
    .insert({
      task_id: taskId,
      execution_id: executionId,
      company_id: companyId,
      sla_policy_id: slaPolicy?.id,
      priority: 'hot',
      target_response_at: targetResponse.toISOString(),
      target_resolution_at: targetResolution.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[LeadScoredHot] Failed to create SLA tracking:', error);
    throw error;
  }

  await (supabase as any)
    .from('workflow_step_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_snapshot: { sla_tracking_id: slaTracking.id, target_response: targetResponse.toISOString() }
    })
    .eq('workflow_execution_id', executionId)
    .eq('step_name', 'start_sla_tracking');

  return slaTracking;
}

/**
 * Get default company ID
 */
async function getDefaultCompanyId(supabase: any): Promise<string> {
  const { data, error } = await (supabase as any)
    .from('companies')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No company found. Please provide company_id.');
  }

  return data.id;
}
