/**
 * ATLAS-ACTION-DISPATCHER
 * ATLAS-MSN-9872
 * 
 * Dispatch actions based on watchlist matches
 */

import { getSupabaseAdmin, withDbRetry } from "./supabase-admin";
import { MatchResult } from "./watchlist-matcher";

export interface DispatchedAction {
  type: 'notification' | 'alert' | 'task' | 'approval';
  id: string;
  status: 'created' | 'auto_executed' | 'pending_approval' | 'error';
  error?: string;
}

/**
 * Check if we're within cooldown period for this rule
 */
async function checkCooldown(ruleId: string, cooldownMinutes: number): Promise<boolean> {
  if (cooldownMinutes <= 0) return false;
  
  const supabase = getSupabaseAdmin();
  const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('watch_alerts')
      .select('id')
      .eq('watch_rule_id', ruleId)
      .gte('created_at', cooldownTime)
      .limit(1);
  }, 'check_cooldown');
  
  if (error) {
    console.error('[ActionDispatcher] Cooldown check failed:', error);
    return false; // Allow on error
  }
  
  return (data || []).length > 0;
}

/**
 * Check daily alert limit for rule
 */
async function checkDailyLimit(ruleId: string, maxDailyAlerts: number): Promise<boolean> {
  if (maxDailyAlerts <= 0) return false;
  
  const supabase = getSupabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('watch_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('watch_rule_id', ruleId)
      .gte('created_at', today.toISOString());
  }, 'check_daily_limit');
  
  if (error) {
    console.error('[ActionDispatcher] Daily limit check failed:', error);
    return false; // Allow on error
  }
  
  return (count || 0) >= maxDailyAlerts;
}

/**
 * Create a watch alert record
 */
async function createWatchAlert(
  match: MatchResult,
  emailData: {
    messageId: string;
    subject: string;
    from: string;
    snippet: string;
    receivedAt: string;
  }
): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('watch_alerts')
      .insert({
        watch_rule_id: match.rule.id,
        owner_id: match.rule.owner_id,
        content_type: 'email',
        content_id: emailData.messageId,
        content_preview: emailData.snippet.substring(0, 500),
        matched_pattern: match.rule.pattern,
        match_confidence: match.confidence,
        source_account: emailData.from,
        source_sender: emailData.from,
        source_subject: emailData.subject,
        received_at: emailData.receivedAt,
        status: 'new',
      })
      .select('id')
      .single();
  }, 'create_watch_alert');
  
  if (error) {
    console.error('[ActionDispatcher] Failed to create alert:', error);
    return null;
  }
  
  return data;
}

/**
 * Create notification for agents
 */
async function createNotification(
  match: MatchResult,
  emailData: { subject: string; from: string },
  alertId: string
): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  
  const title = `Watchlist Alert: ${match.rule.name}`;
  const message = `Email from ${emailData.from}: "${emailData.subject}" matched rule "${match.rule.name}"`;
  
  // Create notification for each agent
  const notifications = match.rule.notify_agent_ids.length > 0
    ? match.rule.notify_agent_ids.map(agentId => ({
        agent_id: agentId,
        title,
        message,
        type: 'watch_alert',
        priority: 'normal',
        read: false,
        related_id: alertId,
        related_type: 'watch_alert',
      }))
    : [{
        agent_id: null, // System notification
        title,
        message,
        type: 'watch_alert',
        priority: 'normal',
        read: false,
        related_id: alertId,
        related_type: 'watch_alert',
      }];
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('notifications')
      .insert(notifications)
      .select('id');
  }, 'create_notifications');
  
  if (error) {
    console.error('[ActionDispatcher] Failed to create notification:', error);
    return null;
  }
  
  return data?.[0] || null;
}

/**
 * Create task from watchlist match
 */
async function createTask(
  match: MatchResult,
  emailData: { subject: string; from: string; messageId: string }
): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('tasks')
      .insert({
        title: `Follow up: ${emailData.subject}`,
        description: `Watchlist "${match.rule.name}" matched email from ${emailData.from}.\n\nMessage ID: ${emailData.messageId}`,
        status: 'pending',
        priority: 'medium',
        assigned_agent_id: match.rule.owner_id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        source: 'watchlist',
        metadata: {
          watch_rule_id: match.rule.id,
          email_from: emailData.from,
          email_subject: emailData.subject,
        },
      })
      .select('id')
      .single();
  }, 'create_task');
  
  if (error) {
    console.error('[ActionDispatcher] Failed to create task:', error);
    return null;
  }
  
  return data;
}

/**
 * Create approval request
 */
async function createApproval(
  match: MatchResult,
  emailData: { subject: string; from: string }
): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('approvals')
      .insert({
        request_type: 'other',
        title: `Action required: ${match.rule.name}`,
        description: `Watchlist "${match.rule.name}" detected email from ${emailData.from}: "${emailData.subject}". Approval required for automated action.`,
        requested_by: match.rule.owner_id,
        status: 'pending',
        approver_id: match.rule.escalation_agent_id || match.rule.owner_id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select('id')
      .single();
  }, 'create_approval');
  
  if (error) {
    console.error('[ActionDispatcher] Failed to create approval:', error);
    return null;
  }
  
  return data;
}

/**
 * Update watch rule match count
 */
async function updateRuleMatchStats(ruleId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  await withDbRetry(async () => {
    return await (supabase as any)
      .from('watch_rules')
      .update({
        match_count: (supabase as any).rpc('increment', { x: 1 }),
        last_matched_at: new Date().toISOString(),
      })
      .eq('id', ruleId);
  }, 'update_rule_stats').catch(err => {
    console.error('[ActionDispatcher] Failed to update rule stats:', err);
  });
}

/**
 * Dispatch actions for a watchlist match
 */
export async function dispatchActions(
  match: MatchResult,
  emailData: {
    messageId: string;
    subject: string;
    from: string;
    snippet: string;
    receivedAt: string;
  }
): Promise<DispatchedAction[]> {
  const actions: DispatchedAction[] = [];
  const rule = match.rule;
  
  // 1. Check cooldown
  const inCooldown = await checkCooldown(rule.id, rule.cooldown_minutes);
  if (inCooldown) {
    console.log(`[ActionDispatcher] Rule ${rule.id} in cooldown, skipping`);
    return actions;
  }
  
  // 2. Check daily limit
  const atLimit = await checkDailyLimit(rule.id, rule.max_daily_alerts);
  if (atLimit) {
    console.log(`[ActionDispatcher] Rule ${rule.id} at daily limit, skipping`);
    return actions;
  }
  
  // 3. Create watch alert (always)
  const alert = await createWatchAlert(match, emailData);
  if (alert) {
    actions.push({
      type: 'alert',
      id: alert.id,
      status: 'created',
    });
  }
  
  // 4. Handle based on action_type and flags
  if (rule.require_approval) {
    // Approval required - create approval request
    const approval = await createApproval(match, {
      subject: emailData.subject,
      from: emailData.from,
    });
    if (approval) {
      actions.push({
        type: 'approval',
        id: approval.id,
        status: 'pending_approval',
      });
    }
  } else if (rule.auto_execute) {
    // Auto-execute based on action_type
    switch (rule.action_type) {
      case 'create_task':
        const task = await createTask(match, {
          subject: emailData.subject,
          from: emailData.from,
          messageId: emailData.messageId,
        });
        if (task) {
          actions.push({
            type: 'task',
            id: task.id,
            status: 'auto_executed',
          });
        }
        break;
        
      case 'alert':
      case 'notify':
      default:
        // Just notification (already created above)
        break;
    }
  }
  
  // 5. Create notifications
  const notification = await createNotification(match, {
    subject: emailData.subject,
    from: emailData.from,
  }, alert?.id || '');
  if (notification) {
    actions.push({
      type: 'notification',
      id: notification.id,
      status: 'created',
    });
  }
  
  // 6. Update rule stats
  await updateRuleMatchStats(rule.id);
  
  return actions;
}
