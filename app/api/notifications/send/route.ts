/**
 * ATLAS-NOTIFICATIONS-SEND API
 * ATLAS-OPTIMUS-EO-AUTOMATION-FIX-050
 * 
 * POST /api/notifications/send
 * Send notifications through multiple channels
 * 
 * Handlers:
 * - meeting_prep: Fetches event by ID, builds payload, calls notification service
 * - approval_request: Fetches approval by ID, builds payload, calls notification service
 * - watchlist_alert: Fetches watchlist item by ID, builds payload, calls notification service
 * - hot_lead_assigned/hot_lead_escalated: Legacy hot lead notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { sendNotification, getNotificationServiceStatus, NotificationPayload } from "@/lib/notification-service";

// Valid notification types
const VALID_NOTIFICATION_TYPES = [
  "hot_lead_assigned",
  "hot_lead_escalated",
  "meeting_prep",
  "approval_request",
  "watchlist_alert"
] as const;

export async function POST(request: NextRequest) {
  const now = new Date().toISOString();
  
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

    // Build notification payload
    const payload: NotificationPayload = {
      type: body.type,
      recipient_id: body.recipient_id,
      priority: body.priority || "normal",
      // Type-specific IDs (for fetch-by-ID pattern)
      event_id: body.event_id || body.event?.id,
      approval_id: body.approval_id || body.approval?.id,
      watchlist_item_id: body.watchlist_item_id || body.watchlist_item?.id,
      lead_id: body.lead_id || body.lead?.id,
      task_id: body.task_id || body.task?.id,
      // Legacy full objects (for hot_lead notifications)
      lead: body.lead,
      task: body.task,
      event: body.event,
      approval: body.approval,
      watchlist_item: body.watchlist_item,
      // Optional overrides
      prep_requirements: body.prep_requirements,
    };

    // Call notification service
    const result = await sendNotification(payload);

    if (!result.sent) {
      return NextResponse.json(
        { 
          sent: false, 
          error: result.error || "Failed to send notification", 
          timestamp: now 
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      sent: true,
      notification_id: result.notification_id,
      type: body.type,
      channels: result.channels,
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
  const status = getNotificationServiceStatus();
  const now = new Date().toISOString();
  
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/notifications/send",
    ...status,
    features: [
      "meeting_prep: fetches executive_events by event_id",
      "approval_request: fetches approval_requests by approval_id", 
      "watchlist_alert: fetches watchlist_items by watchlist_item_id",
      "hot_lead_assigned/hot_lead_escalated: legacy hot lead notifications"
    ],
    timestamp: now,
  }, { status: 200 });
}
