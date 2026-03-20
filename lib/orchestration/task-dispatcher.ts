/**
 * Task Dispatcher Service
 * ATLAS-9925: Bridges Supabase tasks → Redis queues for worker consumption
 * 
 * Polls Supabase for pending tasks and pushes them to agent assignment queues
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "redis";

const POLL_INTERVAL_MS = 3000; // 3 seconds
const MAX_DISPATCH_PER_CYCLE = 10;

let isRunning = false;
let pollTimer: NodeJS.Timeout | null = null;
let redisClient: ReturnType<typeof createClient> | null = null;

const DISPATCHED_TASKS = new Set<string>(); // Prevent duplicates in memory

/**
 * Initialize Redis connection
 */
async function getRedisClient() {
  if (redisClient?.isOpen) return redisClient;
  
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) }
  });
  
  redisClient.on("error", (err) => console.error("[TaskDispatcher] Redis error:", err));
  
  await redisClient.connect();
  console.log("[TaskDispatcher] Redis connected");
  return redisClient;
}

/**
 * Start the task dispatcher loop
 */
export async function startTaskDispatcher(): Promise<void> {
  if (isRunning) {
    console.log("[TaskDispatcher] Already running");
    return;
  }

  isRunning = true;
  console.log("[TaskDispatcher] Starting...");
  
  // Ensure Redis is connected
  await getRedisClient();
  
  // Start polling
  pollTimer = setInterval(pollAndDispatch, POLL_INTERVAL_MS);
  
  // Run immediately
  await pollAndDispatch();
  
  console.log(`[TaskDispatcher] Running (interval: ${POLL_INTERVAL_MS}ms)`);
}

/**
 * Stop the task dispatcher
 */
export async function stopTaskDispatcher(): Promise<void> {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isRunning = false;
  
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
  
  console.log("[TaskDispatcher] Stopped");
}

/**
 * Poll Supabase for pending tasks and dispatch to Redis
 */
async function pollAndDispatch(): Promise<void> {
  if (!isRunning) return;

  try {
    const supabase = getSupabaseAdmin();
    const redis = await getRedisClient();

    // Find pending tasks that haven't been dispatched
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, assigned_agent_id, mission_id, priority, type, execution_id")
      .eq("status", "pending")
      .not("assigned_agent_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(MAX_DISPATCH_PER_CYCLE);

    if (error) {
      console.error("[TaskDispatcher] Query error:", error);
      return;
    }

    if (!tasks || tasks.length === 0) return;

    console.log(`[TaskDispatcher] Found ${tasks.length} pending task(s)`);

    for (const task of tasks as any[]) {
      // Skip if already dispatched this session
      if (DISPATCHED_TASKS.has(task.id)) continue;

      // Determine queue based on assignment
      const agentId = task.assigned_agent_id.toLowerCase();
      const taskType = task.type || "code";
      
      // Build task payload for worker
      const taskPayload = {
        id: task.id,
        type: taskType,
        title: task.title,
        description: task.description,
        assigned_agent_id: agentId,
        mission_id: task.mission_id,
        priority: task.priority || "medium",
        execution_id: task.execution_id,
        status: "queued",
        target_agents: [agentId],
        enqueued_at: new Date().toISOString(),
      };

      // Push to agent's assignment queue (list for FIFO)
      const queueKey = `agent:assignments:${agentId}`;
      await redis.lpush(queueKey, JSON.stringify(taskPayload));
      
      // Also add to task_queue sorted set for priority handling
      const score = task.priority === "critical" ? 100 : task.priority === "high" ? 50 : 10;
      await redis.zadd("task_queue", { score, value: task.id });
      
      // Store full task data
      await redis.set(`task:${task.id}`, JSON.stringify(taskPayload));

      // ATLAS-P0-FIX-001: DO NOT update status to "in_progress" here
      // Worker must claim from "pending" status for atomic claim
      // Status remains "pending" until worker claims it

      DISPATCHED_TASKS.add(task.id);
      console.log(`[TaskDispatcher] ✓ Dispatched task ${task.id.slice(0,8)} to ${agentId} (${taskType})`);
    }

  } catch (error) {
    console.error("[TaskDispatcher] Poll error:", error);
  }
}

/**
 * Get dispatcher status
 */
export function getDispatcherStatus() {
  return {
    isRunning,
    dispatchedCount: DISPATCHED_TASKS.size,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}
