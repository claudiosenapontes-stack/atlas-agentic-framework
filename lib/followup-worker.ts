/**
 * ATLAS-OPTIMUS-EO-AUTOMATION-FIX-050
 * Followup Worker
 * 
 * Processes followup tasks and sends notifications when:
 * - Followup is due (overdue or within 24h)
 * - Followup status changes
 * - Event prep is required
 * 
 * Handlers:
 * - meeting_prep: Fetches event, builds payload, calls notification service
 * - approval_request: Fetches approval, builds payload, calls notification service
 * - watchlist_alert: Fetches watchlist item, builds payload, calls notification service
 */

import { getSupabaseAdmin } from "./supabase-admin";
import { sendNotification, NotificationPayload } from "./notification-service";

export interface FollowupWorkerResult {
  processed: number;
  notified: number;
  errors: number;
  details: Array<{
    id: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Main followup worker entry point
 * Run this periodically (e.g., every 15 minutes) to process followups
 */
export async function runFollowupWorker(): Promise<FollowupWorkerResult> {
  const supabase = getSupabaseAdmin();
  const result: FollowupWorkerResult = {
    processed: 0,
    notified: 0,
    errors: 0,
    details: [],
  };

  try {
    // 1. Process meeting prep notifications (events starting within 24h that need prep)
    await processMeetingPrepNotifications(result);

    // 2. Process overdue followups
    await processOverdueFollowups(result);

    // 3. Process due-soon followups (within 24h)
    await processDueSoonFollowups(result);

    return result;
  } catch (error: any) {
    console.error("[FollowupWorker] Fatal error:", error);
    result.errors++;
    return result;
  }
}

/**
 * Process meeting prep notifications
 * Fetches events starting within 24h that have prep_required flag
 */
async function processMeetingPrepNotifications(result: FollowupWorkerResult): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // Fetch events needing prep that start within 24 hours
    const { data: events, error } = await (supabase as any)
      .from("executive_events")
      .select(`
        *,
        prep_task_id,
        tasks:prep_task_id (*)
      `)
      .eq("prep_required", true)
      .gte("start_time", now.toISOString())
      .lte("start_time", twentyFourHoursFromNow.toISOString());

    if (error) {
      console.error("[FollowupWorker] Error fetching events for prep:", error);
      result.errors++;
      return;
    }

    if (!events || events.length === 0) {
      return;
    }

    for (const event of events) {
      result.processed++;

      try {
        // Check if we already sent a prep notification recently
        const { data: recentNotifications } = await (supabase as any)
          .from("notifications")
          .select("created_at")
          .eq("type", "meeting_prep")
          .eq("metadata->>event_id", event.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastNotification = recentNotifications?.[0];
        const hoursSinceLastNotification = lastNotification
          ? (now.getTime() - new Date(lastNotification.created_at).getTime()) / (1000 * 60 * 60)
          : Infinity;

        // Don't spam - only notify every 12 hours for the same event
        if (hoursSinceLastNotification < 12) {
          continue;
        }

        // Build notification payload
        const payload: NotificationPayload = {
          type: "meeting_prep",
          recipient_id: event.owner_id || "claudio",
          event_id: event.id,
          priority: event.priority === "high" ? "high" : "normal",
          prep_requirements: event.prep_requirements || [],
        };

        // Send notification
        const notificationResult = await sendNotification(payload);

        if (notificationResult.sent) {
          result.notified++;
          result.details.push({
            id: event.id,
            action: "meeting_prep_notification",
            success: true,
          });
        } else {
          result.errors++;
          result.details.push({
            id: event.id,
            action: "meeting_prep_notification",
            success: false,
            error: notificationResult.error,
          });
        }
      } catch (error: any) {
        result.errors++;
        result.details.push({
          id: event.id,
          action: "meeting_prep_notification",
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    console.error("[FollowupWorker] Error in processMeetingPrepNotifications:", error);
    result.errors++;
  }
}

/**
 * Process overdue followups
 * Sends notifications for followups past their due date
 */
async function processOverdueFollowups(result: FollowupWorkerResult): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    // Get overdue tasks linked to meeting_tasks
    const { data: overdueFollowups, error } = await (supabase as any)
      .from("meeting_tasks")
      .select(`
        id,
        event_id,
        task_id,
        context_quote,
        tasks:task_id (*),
        events:event_id (title, start_time, owner_id)
      `)
      .lt("tasks.due_at", now)
      .not("tasks.status", "in", "('completed', 'cancelled')");

    if (error) {
      console.error("[FollowupWorker] Error fetching overdue followups:", error);
      result.errors++;
      return;
    }

    if (!overdueFollowups || overdueFollowups.length === 0) {
      return;
    }

    for (const followup of overdueFollowups) {
      result.processed++;

      try {
        // Check if we already sent an overdue notification today
        const today = new Date().toISOString().split("T")[0];
        const { data: recentNotifications } = await (supabase as any)
          .from("notifications")
          .select("created_at")
          .eq("type", "followup_overdue")
          .eq("metadata->>task_id", followup.task_id)
          .gte("created_at", today)
          .limit(1);

        if (recentNotifications && recentNotifications.length > 0) {
          continue; // Already notified today
        }

        // Send overdue notification
        const payload: NotificationPayload = {
          type: "hot_lead_escalated", // Reuse escalation type for urgency
          recipient_id: followup.tasks?.assigned_agent_id || "claudio",
          priority: "high",
          lead: {
            name: "Followup Task",
            company: followup.events?.title || "Unknown Event",
            email: "",
            score: 100,
            source: "meeting_followup",
          },
          task: {
            id: followup.task_id,
            sla_minutes: 0,
            due_at: followup.tasks?.due_at,
          },
        };

        const notificationResult = await sendNotification(payload);

        if (notificationResult.sent) {
          result.notified++;
          result.details.push({
            id: followup.task_id,
            action: "overdue_notification",
            success: true,
          });
        } else {
          result.errors++;
          result.details.push({
            id: followup.task_id,
            action: "overdue_notification",
            success: false,
            error: notificationResult.error,
          });
        }
      } catch (error: any) {
        result.errors++;
        result.details.push({
          id: followup.task_id,
          action: "overdue_notification",
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    console.error("[FollowupWorker] Error in processOverdueFollowups:", error);
    result.errors++;
  }
}

/**
 * Process followups due soon (within 24h)
 * Sends reminder notifications
 */
async function processDueSoonFollowups(result: FollowupWorkerResult): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // Get followups due within 24h
    const { data: dueSoonFollowups, error } = await (supabase as any)
      .from("meeting_tasks")
      .select(`
        id,
        event_id,
        task_id,
        context_quote,
        tasks:task_id (*),
        events:event_id (title, start_time, owner_id)
      `)
      .gte("tasks.due_at", now.toISOString())
      .lte("tasks.due_at", twentyFourHoursFromNow.toISOString())
      .not("tasks.status", "in", "('completed', 'cancelled')");

    if (error) {
      console.error("[FollowupWorker] Error fetching due-soon followups:", error);
      result.errors++;
      return;
    }

    if (!dueSoonFollowups || dueSoonFollowups.length === 0) {
      return;
    }

    for (const followup of dueSoonFollowups) {
      result.processed++;

      try {
        // Check if we already sent a reminder today
        const today = new Date().toISOString().split("T")[0];
        const { data: recentNotifications } = await (supabase as any)
          .from("notifications")
          .select("created_at")
          .eq("type", "followup_reminder")
          .eq("metadata->>task_id", followup.task_id)
          .gte("created_at", today)
          .limit(1);

        if (recentNotifications && recentNotifications.length > 0) {
          continue; // Already reminded today
        }

        // Send reminder notification
        const payload: NotificationPayload = {
          type: "hot_lead_assigned", // Reuse for reminder style
          recipient_id: followup.tasks?.assigned_agent_id || "claudio",
          priority: "normal",
          lead: {
            name: "Followup Task (Due Soon)",
            company: followup.events?.title || "Unknown Event",
            email: "",
            score: 80,
            source: "meeting_followup",
          },
          task: {
            id: followup.task_id,
            sla_minutes: 0,
            due_at: followup.tasks?.due_at,
          },
        };

        const notificationResult = await sendNotification(payload);

        if (notificationResult.sent) {
          result.notified++;
          result.details.push({
            id: followup.task_id,
            action: "due_soon_notification",
            success: true,
          });
        } else {
          result.errors++;
          result.details.push({
            id: followup.task_id,
            action: "due_soon_notification",
            success: false,
            error: notificationResult.error,
          });
        }
      } catch (error: any) {
        result.errors++;
        result.details.push({
          id: followup.task_id,
          action: "due_soon_notification",
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    console.error("[FollowupWorker] Error in processDueSoonFollowups:", error);
    result.errors++;
  }
}

/**
 * Manual trigger for specific notification types
 * Used by API endpoints to send specific notifications
 */
export async function triggerNotification(
  type: "meeting_prep" | "approval_request" | "watchlist_alert",
  id: string,
  recipientId: string,
  priority?: "low" | "normal" | "high" | "urgent"
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const payload: NotificationPayload = {
      type,
      recipient_id: recipientId,
      priority,
    };

    // Set the appropriate ID field based on type
    if (type === "meeting_prep") {
      payload.event_id = id;
    } else if (type === "approval_request") {
      payload.approval_id = id;
    } else if (type === "watchlist_alert") {
      payload.watchlist_item_id = id;
    }

    const result = await sendNotification(payload);

    return {
      success: result.sent,
      notificationId: result.notification_id,
      error: result.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
