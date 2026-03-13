import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/executions/:id/heartbeat
 * Renew execution lease and update liveness timestamp
 * 
 * Body: {
 *   agent_id: string,
 *   lease_duration_seconds?: number (default: 60)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json();
    const { agent_id, lease_duration_seconds = 60 } = body;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: "Execution ID is required" },
        { status: 400 }
      );
    }

    if (!agent_id) {
      return NextResponse.json(
        { success: false, error: "Agent ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Fetch execution with lease info
    const { data: execution, error: fetchError } = await supabaseAdmin
      .from("executions")
      .select("id, status, agent_id, lease_expires_at, heartbeat_count")
      .eq("id", executionId)
      .single();

    if (fetchError || !execution) {
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exec: any = execution;

    // Step 2: Validate execution is in a state that accepts heartbeats
    if (exec.status !== "in_progress" && exec.status !== "pending") {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot heartbeat execution with status: ${exec.status}`,
          status: exec.status
        },
        { status: 409 }
      );
    }

    // Step 3: Validate agent owns the lease (or lease is expired)
    const now = new Date();
    const leaseExpired = exec.lease_expires_at 
      ? new Date(exec.lease_expires_at) < now 
      : true;
    
    if (exec.agent_id !== agent_id && !leaseExpired) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Lease held by another agent",
          current_agent: exec.agent_id,
          lease_expires_at: exec.lease_expires_at
        },
        { status: 409 }
      );
    }

    // Step 4: Calculate new lease expiry
    const leaseExpiresAt = new Date(now.getTime() + lease_duration_seconds * 1000);
    const newHeartbeatCount = (exec.heartbeat_count || 0) + 1;

    // Step 5: Update execution with heartbeat
    const { data: updatedExecution, error: updateError } = await supabaseAdmin
      .from("executions")
      // @ts-ignore
      .update({
        last_heartbeat_at: now.toISOString(),
        lease_expires_at: leaseExpiresAt.toISOString(),
        heartbeat_count: newHeartbeatCount,
        // If lease was expired, claim it for this agent
        ...(leaseExpired && { agent_id }),
        updated_at: now.toISOString(),
      })
      .eq("id", executionId)
      .select()
      .single();

    if (updateError) {
      console.error("[Heartbeat] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update heartbeat" },
        { status: 500 }
      );
    }

    // Step 6: Record heartbeat event
    await supabaseAdmin
      .from("execution_events")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        event_type: "heartbeat",
        event_data: {
          agent_id,
          lease_duration_seconds,
          lease_expires_at: leaseExpiresAt.toISOString(),
          heartbeat_count: newHeartbeatCount,
          lease_claimed: leaseExpired,
        },
        created_at: now.toISOString(),
      });

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      heartbeat: {
        received_at: now.toISOString(),
        lease_expires_at: leaseExpiresAt.toISOString(),
        heartbeat_count: newHeartbeatCount,
        lease_claimed: leaseExpired,
      },
    });

  } catch (error) {
    console.error("[Heartbeat] Exception:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
