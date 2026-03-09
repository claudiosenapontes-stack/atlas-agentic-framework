import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getRedisClient } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, agentName } = body;

    if (!agentId && !agentName) {
      return NextResponse.json(
        { success: false, error: "agentId or agentName is required" },
        { status: 400 }
      );
    }

    const targetName = agentName || agentId;

    // Step 1: Find the agent in Supabase
    const { data: agent, error: findError } = await supabase
      .from("agents")
      .select("id, name, pid, status")
      .eq("name", targetName)
      .single();

    if (findError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Step 2: Kill the process if PID exists
    let killed = false;
    let killError = null;

    if (agent.pid) {
      try {
        // Try graceful kill first (SIGTERM)
        process.kill(agent.pid, 'SIGTERM');
        killed = true;
        
        // Wait a bit, then force kill if still running
        setTimeout(async () => {
          try {
            process.kill(agent.pid!, 0); // Check if still exists
            process.kill(agent.pid!, 'SIGKILL'); // Force kill
          } catch (e) {
            // Process already dead, good
          }
        }, 5000);

      } catch (err: any) {
        if (err.code === 'ESRCH') {
          // Process already dead
          killed = true;
        } else {
          killError = err.message;
          // Try force kill
          try {
            process.kill(agent.pid, 'SIGKILL');
            killed = true;
          } catch (e) {
            // Failed to kill
          }
        }
      }
    }

    // Step 3: Update Redis presence
    const redis = getRedisClient();
    await redis.hset(`presence:agent:${agent.name}`, {
      status: "offline",
      killed_at: new Date().toISOString(),
    });
    await redis.expire(`presence:agent:${agent.name}`, 60);

    // Step 4: Update Supabase
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        status: "offline",
        killed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pid: null,
      })
      .eq("id", agent.id);

    if (updateError) {
      console.error("[Agent Kill] Supabase update error:", updateError);
    }

    // Step 5: Update any active executions
    await supabase
      .from("executions")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("agent_id", agent.id)
      .eq("status", "in_progress");

    return NextResponse.json({
      success: true,
      killed,
      agentId: agent.id,
      name: agent.name,
      pid: agent.pid,
      killedAt: new Date().toISOString(),
      error: killError,
    });

  } catch (error) {
    console.error("[Agent Kill] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
