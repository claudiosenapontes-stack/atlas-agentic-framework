/**
 * Execution Runner Control API
 * ATLAS-GATE4-EXECUTION-RUNNER-380
 * 
 * POST /api/runner/start - Start the execution runner
 * POST /api/runner/stop - Stop the execution runner
 * GET /api/runner/status - Get runner status
 */

import { NextRequest, NextResponse } from "next/server";
import { startExecutionRunner, stopExecutionRunner } from "@/lib/orchestration/execution-runner";

let isRunnerStarted = false;

/**
 * POST /api/runner/start
 * Start the execution runner loop
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "start") {
      if (isRunnerStarted) {
        return NextResponse.json({
          success: true,
          message: "Execution runner already running",
          status: "running",
        });
      }

      startExecutionRunner();
      isRunnerStarted = true;

      return NextResponse.json({
        success: true,
        message: "Execution runner started",
        status: "running",
        pollIntervalMs: 5000,
      });
    }

    if (action === "stop") {
      stopExecutionRunner();
      isRunnerStarted = false;

      return NextResponse.json({
        success: true,
        message: "Execution runner stopped",
        status: "stopped",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'start' or 'stop'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Runner API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/runner/status
 * Get execution runner status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: isRunnerStarted ? "running" : "stopped",
    pollIntervalMs: 5000,
    timestamp: new Date().toISOString(),
  });
}
