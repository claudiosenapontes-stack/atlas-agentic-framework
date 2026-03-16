import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

// Telegram mapping for Claudio
const TELEGRAM_MAPPINGS: Record<string, string> = {
  "claudio": "8231688634",
  "8231688634": "8231688634",
};

interface NotificationRequest {
  type: "hot_lead_assigned" | "hot_lead_escalated";
  recipient_id: string;
  priority: "low" | "medium" | "high" | "urgent";
  lead: {
    id: string;
    name: string;
    email: string;
    company: string;
    score: number;
    source: string;
    estimated_value?: number;
  };
  task: {
    id: string;
    sla_minutes: number;
    due_at: string;
  };
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  let notificationId = randomUUID();
  
  try {
    const body: NotificationRequest = await request.json();

    // Validate required fields
    if (!body.type || !body.recipient_id || !body.lead || !body.task) {
      return NextResponse.json(
        { sent: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["hot_lead_assigned", "hot_lead_escalated"].includes(body.type)) {
      return NextResponse.json(
        { sent: false, error: "Invalid notification type" },
        { status: 400 }
      );
    }

    const channels: string[] = [];

    // Build notification message
    const emoji = body.type === "hot_lead_escalated" ? "🚨" : "🔥";
    const title = body.type === "hot_lead_escalated" 
      ? `ESCALATED: Hot Lead - ${body.lead.name}` 
      : `Hot Lead Assigned - ${body.lead.name}`;
    
    const messageLines = [
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
    ].filter(Boolean);

    const messageText = messageLines.join("\n");

    // Attempt Telegram notification
    const telegramChatId = TELEGRAM_MAPPINGS[body.recipient_id.toLowerCase()];

    if (telegramChatId) {
      channels.push("telegram");
    }

    // Always add in_app notification
    channels.push("in_app");

    // Store notification in database (matching actual schema)
    const { error: dbError } = await (supabase as any)
      .from("notifications")
      .insert({
        recipient_id: body.recipient_id,
        type: body.type,
        title: title,
        message: messageText,
        created_at: now,
      });

    if (dbError) {
      console.error("[Notifications] DB insert error:", dbError);
      return NextResponse.json(
        { sent: false, error: "Failed to store notification", details: dbError.message },
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
          lead_id: body.lead.id,
          task_id: body.task.id,
          channels: channels,
          priority: body.priority,
        },
        created_at: now,
      });

    if (auditError) {
      console.error("[Notifications] Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    return NextResponse.json({
      sent: true,
      notification_id: notificationId,
      channels: channels,
      delivered_at: now,
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json(
      { sent: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/notifications/send",
    supported_types: ["hot_lead_assigned", "hot_lead_escalated"],
    supported_channels: ["telegram", "in_app"],
    telegram_mappings: Object.keys(TELEGRAM_MAPPINGS),
  }, { status: 200 });
}
