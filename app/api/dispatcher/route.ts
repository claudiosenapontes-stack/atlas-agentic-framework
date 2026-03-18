/**
 * Task Dispatcher API
 * ATLAS-9925: Control endpoint for task dispatcher service
 */

import { NextRequest, NextResponse } from "next/server";
import { startTaskDispatcher, stopTaskDispatcher, getDispatcherStatus } from "@/lib/orchestration/task-dispatcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/dispatcher
 * Body: { action: "start" | "stop" }
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "start") {
      await startTaskDispatcher();
      return NextResponse.json({
        success: true,
        message: "Task dispatcher started",
        status: getDispatcherStatus(),
      });
    }

    if (action === "stop") {
      await stopTaskDispatcher();
      return NextResponse.json({
        success: true,
        message: "Task dispatcher stopped",
        status: getDispatcherStatus(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'start' or 'stop'" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("[Dispatcher API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dispatcher
 * Get dispatcher status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: getDispatcherStatus(),
    timestamp: new Date().toISOString(),
  });
}
