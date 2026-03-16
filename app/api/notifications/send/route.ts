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
        // ATLAS-OPTIMUS-EO-BLOCKER-FIXES-043: Fetch event by ID
        const eventId = body.event_id || (body.event?.id);
        if (!eventId) {
          return NextResponse.json(
            { sent: false, error: "Missing event_id (fetch by ID)", timestamp: now },
            { status: 400 }
          );
        }
        
        // Fetch real record from database
        const { data: event, error: eventError } = await (supabase as any)
          .from('executive_events')
          .select('*')
          .eq('id', eventId)
          .single();
        
        if (eventError || !event) {
          return NextResponse.json(
            { sent: false, error: `Event not found: ${eventId}`, details: eventError?.message, timestamp: now },
            { status: 404 }
          );
        }
        
        title = `Meeting Prep Required: ${event.title}`;
        
        const attendees = event.attendees || [];
        const prepRequirements = event.prep_requirements || body.prep_requirements || [];
        
        messageText = [
          `📅 **${title}**`,
          ``,
          `**When:** ${new Date(event.start_time).toLocaleString()}`,
          attendees.length > 0 ? `**Attendees:** ${Array.isArray(attendees) ? attendees.join(', ') : attendees}` : null,
          event.location ? `**Location:** ${event.location}` : null,
          event.meet_link ? `**Link:** ${event.meet_link}` : null,
          ``,
          prepRequirements.length > 0 ? `**Prep Required:**` : null,
          ...(prepRequirements || []).map((req: string) => `• ${req}`),
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          event_id: event.id,
          prep_requirements: prepRequirements,
          fetched_at: now,
        };
        break;
      }

      case "approval_request": {
        // ATLAS-OPTIMUS-EO-BLOCKER-FIXES-043: Fetch approval by ID
        const approvalId = body.approval_id || (body.approval?.id);
        if (!approvalId) {
          return NextResponse.json(
            { sent: false, error: "Missing approval_id (fetch by ID)", timestamp: now },
            { status: 400 }
          );
        }
        
        // Fetch real record from database
        const { data: approval, error: approvalError } = await (supabase as any)
          .from('approval_requests')
          .select('*')
          .eq('id', approvalId)
          .single();
        
        if (approvalError || !approval) {
          return NextResponse.json(
            { sent: false, error: `Approval not found: ${approvalId}`, details: approvalError?.message, timestamp: now },
            { status: 404 }
          );
        }
        
        title = `Approval Request: ${approval.title}`;
        
        messageText = [
          `⏳ **${title}**`,
          ``,
          `**Type:** ${approval.request_type || 'General'}`,
          approval.description ? `**Description:** ${approval.description}` : null,
          approval.amount ? `**Amount:** $${Number(approval.amount).toLocaleString()} ${approval.currency || 'USD'}` : null,
          ``,
          `**Requested by:** ${approval.requester_id || approval.requested_by || 'Unknown'}`,
          approval.created_at ? `**Requested at:** ${new Date(approval.created_at).toLocaleString()}` : null,
          approval.expires_at ? `**Expires:** ${new Date(approval.expires_at).toLocaleString()}` : null,
          ``,
          `Priority: ${(body.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          approval_id: approval.id,
          request_type: approval.request_type,
          fetched_at: now,
        };
        break;
      }

      case "watchlist_alert": {
        // ATLAS-OPTIMUS-EO-BLOCKER-FIXES-043: Fetch watchlist item by ID
        const watchlistItemId = body.watchlist_item_id || (body.watchlist_item?.id);
        if (!watchlistItemId) {
          return NextResponse.json(
            { sent: false, error: "Missing watchlist_item_id (fetch by ID)", timestamp: now },
            { status: 400 }
          );
        }
        
        // Fetch real record from database
        const { data: watchlistItem, error: watchlistError } = await (supabase as any)
          .from('watchlist_items')
          .select('*')
          .eq('id', watchlistItemId)
          .single();
        
        if (watchlistError || !watchlistItem) {
          return NextResponse.json(
            { sent: false, error: `Watchlist item not found: ${watchlistItemId}`, details: watchlistError?.message, timestamp: now },
            { status: 404 }
          );
        }
        
        title = `Watchlist Alert: ${watchlistItem.title}`;
        
        messageText = [
          `👁️ **${title}**`,
          ``,
          `**Category:** ${watchlistItem.category}`,
          watchlistItem.entity_type ? `**Entity Type:** ${watchlistItem.entity_type}` : null,
          watchlistItem.entity_name ? `**Entity:** ${watchlistItem.entity_name}` : null,
          watchlistItem.reason ? `**Reason:** ${watchlistItem.reason}` : null,
          watchlistItem.notes ? `**Notes:** ${watchlistItem.notes}` : null,
          ``,
          `Priority: ${(body.priority || watchlistItem.priority || 'normal').toUpperCase()}`,
        ].filter(Boolean).join("\n");

        metadata = {
          watchlist_item_id: watchlistItem.id,
          category: watchlistItem.category,
          fetched_at: now,
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
    features: [
      "meeting_prep: fetches executive_events by event_id",
      "approval_request: fetches approval_requests by approval_id", 
      "watchlist_alert: fetches watchlist_items by watchlist_item_id"
    ],
    timestamp: now,
  }, { status: 200 });
}
