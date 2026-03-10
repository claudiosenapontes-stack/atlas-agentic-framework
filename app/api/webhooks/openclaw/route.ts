import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Webhook endpoint for OpenClaw to push real-time updates
// Configure in openclaw.json: hooks.mappings

interface OpenClawWebhookPayload {
  event: 'agent.session.created' | 'agent.session.ended' | 'cron.job.started' | 'cron.job.completed' | 'cron.job.failed';
  timestamp: string;
  data: {
    agentId?: string;
    sessionKey?: string;
    jobId?: string;
    jobName?: string;
    status?: string;
    message?: string;
    metadata?: Record<string, any>;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.OPENCLAW_WEBHOOK_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload: OpenClawWebhookPayload = await request.json();
    console.log('[OpenClaw Webhook] Received:', payload.event, payload.data);

    switch (payload.event) {
      case 'agent.session.created':
        await handleAgentSessionCreated(payload.data);
        break;
      case 'agent.session.ended':
        await handleAgentSessionEnded(payload.data);
        break;
      case 'cron.job.started':
        await handleCronJobStarted(payload.data);
        break;
      case 'cron.job.completed':
        await handleCronJobCompleted(payload.data);
        break;
      case 'cron.job.failed':
        await handleCronJobFailed(payload.data);
        break;
      default:
        console.log('[OpenClaw Webhook] Unknown event:', payload.event);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error) {
    console.error('[OpenClaw Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleAgentSessionCreated(data: any) {
  // Update agent status to online
  const { error } = await supabase
    .from('agents')
    .upsert({
      name: data.agentId,
      display_name: data.agentId,
      status: 'active',
      current_task: data.message || 'Active session',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'name' });

  if (error) console.error('[Webhook] Failed to update agent:', error);
}

async function handleAgentSessionEnded(data: any) {
  // Update agent status to offline
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'inactive',
      current_task: null,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('name', data.agentId);

  if (error) console.error('[Webhook] Failed to update agent:', error);
}

async function handleCronJobStarted(data: any) {
  // Create or update task as in_progress
  const { error } = await supabase
    .from('tasks')
    .upsert({
      id: data.jobId,
      title: data.jobName || 'Scheduled Task',
      description: data.message || '',
      status: 'in_progress',
      priority: 'medium',
      assigned_agent_id: data.agentId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) console.error('[Webhook] Failed to create task:', error);
}

async function handleCronJobCompleted(data: any) {
  // Update task as completed
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', data.jobId);

  if (error) console.error('[Webhook] Failed to update task:', error);
}

async function handleCronJobFailed(data: any) {
  // Update task as blocked/failed
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'blocked',
      description: data.message || 'Task failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.jobId);

  if (error) console.error('[Webhook] Failed to update task:', error);
}

// GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'OpenClaw webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}
