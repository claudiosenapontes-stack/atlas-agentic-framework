/**
 * ATLAS-FOLLOWUP-WORKER API
 * ATLAS-OPTIMUS-EO-AUTOMATION-FIX-050
 * 
 * POST /api/workers/followup
 * Run the followup worker to process:
 * - Meeting prep notifications
 * - Overdue followups
 * - Due-soon reminders
 */

import { NextRequest, NextResponse } from "next/server";
import { runFollowupWorker, triggerNotification } from "@/lib/followup-worker";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json().catch(() => ({}));
    
    // Support manual trigger of specific notification types
    if (body.action === "trigger" && body.type && body.id) {
      const result = await triggerNotification(
        body.type,
        body.id,
        body.recipient_id || "claudio",
        body.priority
      );
      
      return NextResponse.json({
        success: result.success,
        action: "trigger",
        type: body.type,
        id: body.id,
        notification_id: result.notificationId,
        error: result.error,
        timestamp,
      }, { status: result.success ? 200 : 500 });
    }
    
    // Run full followup worker
    const result = await runFollowupWorker();
    
    return NextResponse.json({
      success: true,
      action: "run_followup_worker",
      result: {
        processed: result.processed,
        notified: result.notified,
        errors: result.errors,
      },
      details: result.details,
      timestamp,
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("[FollowupWorker API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
      timestamp,
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/workers/followup",
    actions: [
      "POST { } - Run full followup worker",
      "POST { action: 'trigger', type: 'meeting_prep|approval_request|watchlist_alert', id: '...' } - Trigger specific notification"
    ],
    features: [
      "meeting_prep: Sends notifications for events with prep_required within 24h",
      "overdue_followups: Sends notifications for overdue tasks",
      "due_soon_followups: Sends reminders for tasks due within 24h"
    ],
    timestamp,
  }, { status: 200 });
}
