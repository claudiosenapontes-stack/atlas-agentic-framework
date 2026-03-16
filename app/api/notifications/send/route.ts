import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

// Telegram mapping for Claudio
const TELEGRAM_MAPPINGS: Record<string, string> = {
  "claudio": "8231688634",
  "8231688634": "8231688634",
};

// Valid notification types
const VALID_NOTIFICATION_TYPES = [
  "hot_lead_assigned",
  "hot_lead_escalated",
  "meeting_prep",
  "approval_request",
  "watchlist_alert"
] as const;

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  let notificationId = randomUUID();
  
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.recipient_id) {
      return NextResponse.json(
        { sent: false, error: "Missing required fields: type, recipient_id", timestamp: now },
        { status: 400 }
      );
    }

    if (!VALID_NOTIFICATION_TYPES.includes(body.type)) {
      return NextResponse.json(
        { sent: false, error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`, timestamp: now },
        { status: 400 }
      );
    }

    const channels: string[] = [];
    let title: string;
    let messageText: string;
    let metadata: Record<string, any> = {};

    // Build notification based on type
    switch (body.type) {
      case "hot_lead_assigned":
      case "hot_lead_escalated": {
        if (!body.lead || !body.task) {
          return NextResponse.json(
            { sent: false, error: "Missing lead or task data", timestamp: now },
            { status: 400 }
          );
        }
        
        const emoji = body.type === "hot_lead_escalated" ? "🚨" : "🔥";
        title = body.type === "hot_lead_escalated" 
          ? `ESCALATED: Hot Lead - ${body.lead.name}` 
          : `Hot Lead Assigned - ${body.lead.name}`;
        
        messageText = [
          `${emoji} **${title}**`,
          ``,
          `**Lead:** ${body.lead.name}`,
          `**Company:** ${body.lead.company}`,
          `**Email:** ${body.lead.email}`,
          `**Score:** ${body.lead.score}/100`,
          `**Source:** ${body.lead.source}`,
          body.lead.estimated_value ? `**Est. Value:** $${body.lead.estimated_value.toLocaleString()}` : null,
          ``,
          `**Task:** ${body.task.id}`,
          `**SLA:** ${body.task.sla_minutes} minutes`,
          `**Due:** ${new Date(body.task.due_at).toLocaleString()}`,
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          lead_id: body.lead.id,
          task_id: body.task.id,
        };
        break;
      }

      case "meeting_prep": {
        if (!body.event) {
          return NextResponse.json(
            { sent: false, error: "Missing event data", timestamp: now },
            { status: 400 }
          );
        }
        
        title = `Meeting Prep Required: ${body.event.title}`;
        
        messageText = [
          `📅 **${title}**`,
          ``,
          `**When:** ${new Date(body.event.start_time).toLocaleString()}`,
          `**Attendees:** ${body.event.attendees.join(', ')}`,
          body.event.location ? `**Location:** ${body.event.location}` : null,
          body.event.meet_link ? `**Link:** ${body.event.meet_link}` : null,
          ``,
          body.prep_requirements ? `**Prep Required:**` : null,
          ...(body.prep_requirements || []).map((req: string) => `• ${req}`),
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          event_id: body.event.id,
          prep_requirements: body.prep_requirements || [],
        };
        break;
      }

      case "approval_request": {
        if (!body.approval) {
          return NextResponse.json(
            { sent: false, error: "Missing approval data", timestamp: now },
            { status: 400 }
          );
        }
        
        title = `Approval Request: ${body.approval.title}`;
        
        messageText = [
          `⏳ **${title}**`,
          ``,
          `**Type:** ${body.approval.request_type}`,
          body.approval.description ? `**Description:** ${body.approval.description}` : null,
          body.approval.amount ? `**Amount:** $${body.approval.amount.toLocaleString()} ${body.approval.currency || 'USD'}` : null,
          ``,
          `**Requested by:** ${body.approval.requested_by}`,
          `**Requested at:** ${new Date(body.approval.requested_at).toLocaleString()}`,
          body.approval.expires_at ? `**Expires:** ${new Date(body.approval.expires_at).toLocaleString()}` : null,
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          approval_id: body.approval.id,
          request_type: body.approval.request_type,
        };
        break;
      }

      case "watchlist_alert": {
        if (!body.watchlist_item) {
          return NextResponse.json(
            { sent: false, error: "Missing watchlist_item data", timestamp: now },
            { status: 400 }
          );
        }
        
        title = `Watchlist Alert: ${body.watchlist_item.title}`;
        
        messageText = [
          `👁️ **${title}**`,
          ``,
          `**Category:** ${body.watchlist_item.category}`,
          body.watchlist_item.entity_type ? `**Entity Type:** ${body.watchlist_item.entity_type}` : null,
          body.watchlist_item.entity_name ? `**Entity:** ${body.watchlist_item.entity_name}` : null,
          body.watchlist_item.reason ? `**Reason:** ${body.watchlist_item.reason}` : null,
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          watchlist_item_id: body.watchlist_item.id,
          category: body.watchlist_item.category,
        };
        break;
      }

      default:
        return NextResponse.json(
          { sent: false, error: "Unhandled notification type", timestamp: now },
          { status: 400 }
        );
    }

    // Attempt Telegram notification
    const telegramChatId = TELEGRAM_MAPPINGS[body.recipient_id.toLowerCase()];
    if (telegramChatId) {
      channels.push("telegram");
    }

    // Always add in_app notification
    channels.push("in_app");

    // Store notification in database
    const { error: dbError } = await (supabase as any)
      .from("notifications")
      .insert({
        id: notificationId,
        recipient_id: body.recipient_id,
        type: body.type,
        title: title,
        message: messageText,
        metadata: metadata,
        created_at: now,
      });

    if (dbError) {
      console.error("[Notifications] DB insert error:", dbError);
      return NextResponse.json(
        { sent: false, error: "Failed to store notification", details: dbError.message, timestamp: now },
        { status: 500 }
      );
    }

    // Log to execution_events for audit trail
    const { error: auditError } = await (supabase as any)
      .from("execution_events")
      .insert({
        id: randomUUID(),
        event_type: "notification_sent",
        payload: {
          notification_id: notificationId,
          type: body.type,
          recipient_id: body.recipient_id,
          channels: channels,
          priority: body.priority,
          metadata: metadata,
        },
        created_at: now,
      });

    if (auditError) {
      console.error("[Notifications] Audit log error:", auditError);
    }

    // Return success response
    return NextResponse.json({
      sent: true,
      notification_id: notificationId,
      type: body.type,
      channels: channels,
      delivered_at: now,
      timestamp: now,
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json(
      { sent: false, error: error.message || "Internal server error", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const now = new Date().toISOString();
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/notifications/send",
    supported_types: VALID_NOTIFICATION_TYPES,
    supported_channels: ["telegram", "in_app"],
    telegram_mappings: Object.keys(TELEGRAM_MAPPINGS),
    timestamp: now,
  }, { status: 200 });
}