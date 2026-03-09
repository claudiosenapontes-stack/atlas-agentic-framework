import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { supabase } from "@/lib/supabase";
import { spawn } from "child_process";
import path from "path";

// Agent type definitions
const AGENT_TYPES = {
  forge: {
    name: "Forge",
    description: "Code generation and implementation specialist",
    capabilities: ["coding", "architecture", "refactoring"],
    script: "agents/forge/index.js",
  },
  vector: {
    name: "Vector",
    description: "Data analysis and visualization expert",
    capabilities: ["analytics", "charts", "reporting"],
    script: "agents/vector/index.js",
  },
  scout: {
    name: "Scout",
    description: "Research and reconnaissance agent",
    capabilities: ["web_search", "data_gathering", "monitoring"],
    script: "agents/scout/index.js",
  },
  guard: {
    name: "Guard",
    description: "Security and validation specialist",
    capabilities: ["security", "testing", "validation"],
    script: "agents/guard/index.js",
  },
  flux: {
    name: "Flux",
    description: "DevOps and deployment automation",
    capabilities: ["deployment", "infrastructure", "ci_cd"],
    script: "agents/flux/index.js",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, taskId, context, agentName } = body;

    // Validation
    if (!agentType || typeof agentType !== "string") {
      return NextResponse.json(
        { success: false, error: "agentType is required" },
        { status: 400 }
      );
    }

    const agentConfig = AGENT_TYPES[agentType.toLowerCase() as keyof typeof AGENT_TYPES];
    
    if (!agentConfig) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid agent type",
          validTypes: Object.keys(AGENT_TYPES)
        },
        { status: 400 }
      );
    }

    // Generate unique agent ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const agentId = `${agentType.toLowerCase()}-${timestamp}-${randomSuffix}`;
    const displayName = agentName || `${agentConfig.name}-${randomSuffix}`;

    // Get Redis URL from env for the agent
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Step 1: Register agent in Supabase
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: agentId,
        display_name: displayName,
        role: agentType.toLowerCase(),
        status: "spawning",
        capabilities: agentConfig.capabilities,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (agentError) {
      console.error("[Agent Spawn] Supabase error:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to register agent" },
        { status: 500 }
      );
    }

    // Step 2: Set initial presence in Redis
    const redis = getRedisClient();
    await redis.hset(`presence:agent:${agentId}`, {
      status: "spawning",
      agent_type: agentType,
      task_id: taskId || "",
      context: JSON.stringify(context || {}),
      spawned_at: new Date().toISOString(),
      pid: "spawning",
    });
    await redis.expire(`presence:agent:${agentId}`, 3600);

    // Step 3: Spawn real process using child_process
    const scriptPath = path.join(process.cwd(), agentConfig.script);
    
    const childProcess = spawn('node', [scriptPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        AGENT_ID: agentId,
        AGENT_NAME: displayName,
        AGENT_TYPE: agentType,
        TASK_ID: taskId || '',
        AGENT_CONTEXT: JSON.stringify(context || {}),
        REDIS_URL: redisUrl,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_KEY: supabaseKey,
      },
    });

    const pid = childProcess.pid;

    // Log agent output
    childProcess.stdout?.on('data', (data) => {
      console.log(`[${agentId}] ${data.toString().trim()}`);
    });

    childProcess.stderr?.on('data', (data) => {
      console.error(`[${agentId}] ERROR: ${data.toString().trim()}`);
    });

    childProcess.on('exit', (code) => {
      console.log(`[${agentId}] Process exited with code ${code}`);
      // Update Supabase status
      supabase
        .from("agents")
        .update({ status: code === 0 ? 'offline' : 'error', updated_at: new Date().toISOString() })
        .eq("id", agent.id)
        .then(() => {});
    });

    // Unref so parent can exit independently
    childProcess.unref();

    // Step 4: If taskId provided, assign the task
    if (taskId) {
      await supabase
        .from("tasks")
        .update({
          assigned_agent_id: agent.id,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      // Create execution record
      await supabase.from("executions").insert({
        task_id: taskId,
        agent_id: agent.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    }

    // Step 5: Update presence with real PID
    await redis.hset(`presence:agent:${agentId}`, {
      pid: pid?.toString() || 'unknown',
      status: 'online',
    });

    // Step 6: Update Supabase to active
    await supabase
      .from("agents")
      .update({ 
        status: "active",
        pid: pid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      name: agentId,
      displayName,
      type: agentType,
      status: "online",
      pid: pid,
      taskId: taskId || null,
      spawnedAt: new Date().toISOString(),
      message: `Agent ${displayName} spawned (PID: ${pid})`,
    }, { status: 201 });

  } catch (error) {
    console.error("[Agent Spawn] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also export the agent types for GET request
export async function GET() {
  return NextResponse.json({
    types: AGENT_TYPES,
  });
}
