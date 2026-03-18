/**
 * ATLAS-ACTIONS-DISPATCH
 * Dispatch actions based on watchlist matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface DispatchPayload {
  email_id: string;
  rule_id: string;
  action_type: string;
  email_data: {
    subject: string;
    from: string;
    to: string;
    body: string;
    received_at: string;
  };
  classification_id?: string;
}

interface ActionResult {
  action_id: string;
  type: string;
  status: 'created' | 'failed';
  target_id?: string;
  error?: string;
}

async function createTask(supabase: any, payload: DispatchPayload): Promise<ActionResult> {
  const taskId = randomUUID();
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      title: `Follow up: ${payload.email_data.subject}`,
      description: `From: ${payload.email_data.from}\n\n${payload.email_data.body.substring(0, 500)}`,
      status: 'pending',
      priority: 'high',
      source_email_id: payload.email_id,
      watch_rule_id: payload.rule_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      action_id: taskId,
      type: 'task',
      status: 'failed',
      error: error.message,
    };
  }

  return {
    action_id: taskId,
    type: 'task',
    status: 'created',
    target_id: data.id,
  };
}

async function createApproval(supabase: any, payload: DispatchPayload): Promise<ActionResult> {
  const approvalId = randomUUID();
  
  const { data, error } = await supabase
    .from('approvals')
    .insert({
      id: approvalId,
      title: `Review: ${payload.email_data.subject}`,
      description: `From: ${payload.email_data.from}\n\n${payload.email_data.body.substring(0, 500)}`,
      status: 'pending',
      request_type: 'email_review',
      source_email_id: payload.email_id,
      watch_rule_id: payload.rule_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      action_id: approvalId,
      type: 'approval',
      status: 'failed',
      error: error.message,
    };
  }

  return {
    action_id: approvalId,
    type: 'approval',
    status: 'created',
    target_id: data.id,
  };
}

async function createAlert(supabase: any, payload: DispatchPayload): Promise<ActionResult> {
  const alertId = randomUUID();
  
  const { data, error } = await supabase
    .from('watch_alerts')
    .insert({
      id: alertId,
      email_id: payload.email_id,
      rule_id: payload.rule_id,
      subject: payload.email_data.subject,
      sender: payload.email_data.from,
      status: 'unread',
      action_taken: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      action_id: alertId,
      type: 'alert',
      status: 'failed',
      error: error.message,
    };
  }

  return {
    action_id: alertId,
    type: 'alert',
    status: 'created',
    target_id: data.id,
  };
}

async function createFollowUp(supabase: any, payload: DispatchPayload): Promise<ActionResult> {
  const followUpId = randomUUID();
  const scheduledFor = new Date();
  scheduledFor.setHours(scheduledFor.getHours() + 24); // Default 24 hours
  
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      id: followUpId,
      email_id: payload.email_id,
      rule_id: payload.rule_id,
      subject: `Follow up: ${payload.email_data.subject}`,
      scheduled_for: scheduledFor.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      action_id: followUpId,
      type: 'followup',
      status: 'failed',
      error: error.message,
    };
  }

  return {
    action_id: followUpId,
    type: 'followup',
    status: 'created',
    target_id: data.id,
  };
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const payload: DispatchPayload = await request.json();
    const supabase = getSupabaseAdmin();

    let result: ActionResult;

    switch (payload.action_type) {
      case 'task':
        result = await createTask(supabase, payload);
        break;
      case 'approval':
        result = await createApproval(supabase, payload);
        break;
      case 'alert':
        result = await createAlert(supabase, payload);
        break;
      case 'followup':
        result = await createFollowUp(supabase, payload);
        break;
      default:
        // Default to alert for unknown action types
        result = await createAlert(supabase, payload);
    }

    // Log the dispatch
    await supabase.from('action_dispatches').insert({
      id: randomUUID(),
      email_id: payload.email_id,
      rule_id: payload.rule_id,
      action_type: payload.action_type,
      result,
      created_at: timestamp,
    });

    if (result.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: result.error,
        result,
        timestamp,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp,
    });

  } catch (error: any) {
    console.error('Action dispatch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Action dispatch endpoint active',
    supported_actions: ['alert', 'task', 'approval', 'followup'],
    timestamp: new Date().toISOString(),
  });
}
