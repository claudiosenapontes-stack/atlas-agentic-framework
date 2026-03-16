/**
 * ATLAS-OPTIMUS-EO-AUTOMATION-FIX-050
 * Notification Service
 * 
 * Handles notification delivery with:
 * - Record fetching by ID
 * - Payload building
 * - Multi-channel delivery (in_app, telegram)
 * - Audit logging
 */

import { getSupabaseAdmin } from "./supabase-admin";
import { randomUUID } from "crypto";

// Telegram mapping for Claudio
const TELEGRAM_MAPPINGS: Record<string, string> = {
  "claudio": "8231688634",
  "8231688634": "8231688634",
};

export type NotificationType = 
  | "meeting_prep"
  | "approval_request"
  | "watchlist_alert"
  | "hot_lead_assigned"
  | "hot_lead_escalated";

export interface NotificationPayload {
  type: NotificationType;
  recipient_id: string;
  priority?: "low" | "normal" | "high" | "urgent";
  // Type-specific IDs
  event_id?: string;
  approval_id?: string;
  watchlist_item_id?: string;
  lead_id?: string;
  task_id?: string;
  // Legacy support
  event?: { id: string };
  approval?: { id: string };
  watchlist_item?: { id: string };
  lead?: any;
  task?: any;
  // Optional overrides
  prep_requirements?: string[];
}

export interface NotificationResult {
  sent: boolean;
  notification_id?: string;
  channels: string[];
  error?: string;
  timestamp: string;
}

/**
 * Main notification service - sends notifications through all configured channels
 */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  const notificationId = randomUUID();
  
  try {
    // Build notification content based on type
    const { title, message, metadata } = await buildNotificationContent(payload);
    
    // Determine channels
    const channels: string[] = [];
    const telegramChatId = TELEGRAM_MAPPINGS[payload.recipient_id.toLowerCase()];
    if (telegramChatId) {
      channels.push("telegram");
    }
    channels.push("in_app");
    
    // Store notification in database
    const { error: dbError } = await (supabase as any)
      .from("notifications")
      .insert({
        id: notificationId,
        recipient_id: payload.recipient_id,
        type: payload.type,
        title: title,
        message: message,
        metadata: metadata,
        created_at: timestamp,
      });

    if (dbError) {
      console.error("[NotificationService] DB insert error:", dbError);
      return {
        sent: false,
        error: `Failed to store notification: ${dbError.message}`,
        timestamp,
        channels: [],
      };
    }

    // Log to execution_events for audit trail
    await logNotificationEvent(notificationId, payload, channels, metadata, timestamp);
    
    return {
      sent: true,
      notification_id: notificationId,
      channels,
      timestamp,
    };
    
  } catch (error: any) {
    console.error("[NotificationService] Error:", error);
    return {
      sent: false,
      error: error.message || "Internal server error",
      timestamp,
      channels: [],
    };
  }
}

/**
 * Build notification content based on type
 */
async function buildNotificationContent(payload: NotificationPayload): Promise<{
  title: string;
  message: string;
  metadata: Record<string, any>;
}> {
  switch (payload.type) {
    case "meeting_prep":
      return buildMeetingPrepNotification(payload);
    case "approval_request":
      return buildApprovalRequestNotification(payload);
    case "watchlist_alert":
      return buildWatchlistAlertNotification(payload);
    case "hot_lead_assigned":
    case "hot_lead_escalated":
      return buildHotLeadNotification(payload);
    default:
      throw new Error(`Unknown notification type: ${payload.type}`);
  }
}

/**
 * Handler: meeting_prep
 * 1. Fetch event by ID
 * 2. Build payload
 * 3. Return formatted notification
 */
async function buildMeetingPrepNotification(payload: NotificationPayload): Promise<{
  title: string;
  message: string;
  metadata: Record<string, any>;
}> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  // 1. Fetch record by ID
  const eventId = payload.event_id || payload.event?.id;
  if (!eventId) {
    throw new Error("Missing event_id (fetch by ID)");
  }
  
  const { data: event, error: eventError } = await (supabase as any)
    .from("executive_events")
    .select("*")
    .eq("id", eventId)
    .single();
  
  if (eventError || !event) {
    throw new Error(`Event not found: ${eventId}`);
  }
  
  // 2. Build payload
  const title = `Meeting Prep Required: ${event.title}`;
  const attendees = event.attendees || [];
  const prepRequirements = payload.prep_requirements || event.prep_requirements || [];
  
  const messageLines = [
    `📅 **${title}**`,
    "",
    `**When:** ${new Date(event.start_time).toLocaleString()}`,
    attendees.length > 0 ? `**Attendees:** ${Array.isArray(attendees) ? attendees.join(", ") : attendees}` : null,
    event.location ? `**Location:** ${event.location}` : null,
    event.meet_link ? `**Link:** ${event.meet_link}` : null,
    "",
    prepRequirements.length > 0 ? `**Prep Required:**` : null,
    ...(prepRequirements || []).map((req: string) => `• ${req}`),
    "",
    `Priority: ${(payload.priority || "normal").toUpperCase()}`,
  ].filter(Boolean);
  
  // 3. Return formatted notification
  return {
    title,
    message: messageLines.join("\n"),
    metadata: {
      event_id: event.id,
      prep_requirements: prepRequirements,
      fetched_at: timestamp,
    },
  };
}

/**
 * Handler: approval_request
 * 1. Fetch approval by ID
 * 2. Build payload
 * 3. Return formatted notification
 */
async function buildApprovalRequestNotification(payload: NotificationPayload): Promise<{
  title: string;
  message: string;
  metadata: Record<string, any>;
}> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  // 1. Fetch record by ID
  const approvalId = payload.approval_id || payload.approval?.id;
  if (!approvalId) {
    throw new Error("Missing approval_id (fetch by ID)");
  }
  
  const { data: approval, error: approvalError } = await (supabase as any)
    .from("approval_requests")
    .select("*")
    .eq("id", approvalId)
    .single();
  
  if (approvalError || !approval) {
    throw new Error(`Approval not found: ${approvalId}`);
  }
  
  // 2. Build payload
  const title = `Approval Request: ${approval.title}`;
  
  const messageLines = [
    `⏳ **${title}**`,
    "",
    `**Type:** ${approval.request_type || "General"}`,
    approval.description ? `**Description:** ${approval.description}` : null,
    approval.amount ? `**Amount:** $${Number(approval.amount).toLocaleString()} ${approval.currency || "USD"}` : null,
    "",
    `**Requested by:** ${approval.requester_id || approval.requested_by || "Unknown"}`,
    approval.created_at ? `**Requested at:** ${new Date(approval.created_at).toLocaleString()}` : null,
    approval.expires_at ? `**Expires:** ${new Date(approval.expires_at).toLocaleString()}` : null,
    "",
    `Priority: ${(payload.priority || "normal").toUpperCase()}`,
  ].filter(Boolean);
  
  // 3. Return formatted notification
  return {
    title,
    message: messageLines.join("\n"),
    metadata: {
      approval_id: approval.id,
      request_type: approval.request_type,
      fetched_at: timestamp,
    },
  };
}

/**
 * Handler: watchlist_alert
 * 1. Fetch watchlist item by ID
 * 2. Build payload
 * 3. Return formatted notification
 */
async function buildWatchlistAlertNotification(payload: NotificationPayload): Promise<{
  title: string;
  message: string;
  metadata: Record<string, any>;
}> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  // 1. Fetch record by ID
  const watchlistItemId = payload.watchlist_item_id || payload.watchlist_item?.id;
  if (!watchlistItemId) {
    throw new Error("Missing watchlist_item_id (fetch by ID)");
  }
  
  const { data: watchlistItem, error: watchlistError } = await (supabase as any)
    .from("watchlist_items")
    .select("*")
    .eq("id", watchlistItemId)
    .single();
  
  if (watchlistError || !watchlistItem) {
    throw new Error(`Watchlist item not found: ${watchlistItemId}`);
  }
  
  // 2. Build payload
  const title = `Watchlist Alert: ${watchlistItem.title}`;
  
  const messageLines = [
    `👁️ **${title}**`,
    "",
    `**Category:** ${watchlistItem.category}`,
    watchlistItem.entity_type ? `**Entity Type:** ${watchlistItem.entity_type}` : null,
    watchlistItem.entity_name ? `**Entity:** ${watchlistItem.entity_name}` : null,
    watchlistItem.reason ? `**Reason:** ${watchlistItem.reason}` : null,
    watchlistItem.notes ? `**Notes:** ${watchlistItem.notes}` : null,
    "",
    `Priority: ${(payload.priority || watchlistItem.priority || "normal").toUpperCase()}`,
  ].filter(Boolean);
  
  // 3. Return formatted notification
  return {
    title,
    message: messageLines.join("\n"),
    metadata: {
      watchlist_item_id: watchlistItem.id,
      category: watchlistItem.category,
      fetched_at: timestamp,
    },
  };
}

/**
 * Handler: hot_lead notifications
 */
async function buildHotLeadNotification(payload: NotificationPayload): Promise<{
  title: string;
  message: string;
  metadata: Record<string, any>;
}> {
  const lead = payload.lead;
  const task = payload.task;
  
  if (!lead || !task) {
    throw new Error("Missing lead or task data");
  }
  
  const isEscalated = payload.type === "hot_lead_escalated";
  const emoji = isEscalated ? "🚨" : "🔥";
  const title = isEscalated 
    ? `ESCALATED: Hot Lead - ${lead.name}` 
    : `Hot Lead Assigned - ${lead.name}`;
  
  const messageLines = [
    `${emoji} **${title}**`,
    "",
    `**Lead:** ${lead.name}`,
    `**Company:** ${lead.company}`,
    `**Email:** ${lead.email}`,
    `**Score:** ${lead.score}/100`,
    `**Source:** ${lead.source}`,
    lead.estimated_value ? `**Est. Value:** $${lead.estimated_value.toLocaleString()}` : null,
    "",
    `**Task:** ${task.id}`,
    `**SLA:** ${task.sla_minutes} minutes`,
    `**Due:** ${new Date(task.due_at).toLocaleString()}`,
    "",
    `Priority: ${(payload.priority || "normal").toUpperCase()}`,
  ].filter(Boolean);
  
  return {
    title,
    message: messageLines.join("\n"),
    metadata: {
      lead_id: lead.id,
      task_id: task.id,
    },
  };
}

/**
 * Log notification event for audit trail
 */
async function logNotificationEvent(
  notificationId: string,
  payload: NotificationPayload,
  channels: string[],
  metadata: Record<string, any>,
  timestamp: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  try {
    await (supabase as any).from("execution_events").insert({
      id: randomUUID(),
      event_type: "notification_sent",
      payload: {
        notification_id: notificationId,
        type: payload.type,
        recipient_id: payload.recipient_id,
        channels: channels,
        priority: payload.priority,
        metadata: metadata,
      },
      created_at: timestamp,
    });
  } catch (error) {
    console.error("[NotificationService] Audit log error:", error);
  }
}

/**
 * Get notification service health/status
 */
export function getNotificationServiceStatus(): {
  status: string;
  supported_types: NotificationType[];
  supported_channels: string[];
  telegram_mappings: string[];
} {
  return {
    status: "ok",
    supported_types: [
      "meeting_prep",
      "approval_request",
      "watchlist_alert",
      "hot_lead_assigned",
      "hot_lead_escalated",
    ],
    supported_channels: ["telegram", "in_app"],
    telegram_mappings: Object.keys(TELEGRAM_MAPPINGS),
  };
}
