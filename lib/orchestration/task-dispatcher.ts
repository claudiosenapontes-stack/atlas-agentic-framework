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
 * Poll for pending tasks and dispatch to Redis
 * ATLAS-P0-HOTFIX-002: Dual-mode operation (Redis-first + Supabase fallback)
 */
async function pollAndDispatch(): Promise<void> {
  if (!isRunning) return;

  try {
    const redis = await getRedisClient();

    // ATLAS-P0-HOTFIX-002: Try Redis task_queue first (bypass Supabase timeout issues)
    const queuedTaskIds = await redis.zrange("task_queue", 0, MAX_DISPATCH_PER_CYCLE - 1) as string[];
    
    if (queuedTaskIds && queuedTaskIds.length > 0) {
      console.log(`[TaskDispatcher] Found ${queuedTaskIds.length} task(s) in Redis task_queue`);
      
      for (const taskId of queuedTaskIds) {
        // Skip if already dispatched this session
        if (DISPATCHED_TASKS.has(taskId)) continue;

        // Get task data from Redis
        const taskData = await redis.get(`task:${taskId}`);
        if (!taskData) {
          console.log(`[TaskDispatcher] No data for task ${taskId}, removing from queue`);
          await redis.zrem("task_queue", taskId);
          continue;
        }

        const task = JSON.parse(taskData as string);
        const agentId = (task.assigned_agent_id || task.agent_id || "henry").toLowerCase();
        
        // Build task payload for worker
        const taskPayload = {
          id: task.id || taskId,
          type: task.type || "code",
          title: task.title || "Untitled Task",
          description: task.description || "",
          assigned_agent_id: agentId,
          mission_id: task.mission_id || null,
          priority: task.priority || "medium",
          execution_id: task.execution_id || null,
          status: "queued",
          target_agents: [agentId],
          enqueued_at: new Date().toISOString(),
        };

        // Push to agent's assignment queue (list for FIFO) - THIS IS THE FIX
        const queueKey = `agent:assignments:${agentId}`;
        await redis.lpush(queueKey, JSON.stringify(taskPayload));
        
        // Remove from task_queue since we've dispatched it
        await redis.zrem("task_queue", taskId);
        
        // Store full task data
        await redis.set(`task:${taskId}`, JSON.stringify(taskPayload));

        DISPATCHED_TASKS.add(taskId);
        console.log(`[TaskDispatcher] ✓ Dispatched task ${taskId.slice(0,8)} to ${agentId} queue: ${queueKey}`);
      }
      
      // If we dispatched from Redis, we're done for this cycle
      if (DISPATCHED_TASKS.size > 0) return;
    }

    // Fallback: Try Supabase query (with timeout protection)
    try {
      const supabase = getSupabaseAdmin();
      
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, description, status, assigned_agent_id, mission_id, priority, type, execution_id")
        .eq("status", "pending")
        .not("assigned_agent_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(MAX_DISPATCH_PER_CYCLE);

      if (error) {
        console.error("[TaskDispatcher] Supabase query error:", error.message);
        return;
      }

      if (!tasks || tasks.length === 0) return;

      console.log(`[TaskDispatcher] Found ${tasks.length} pending task(s) in Supabase`);

      for (const task of tasks as any[]) {
        if (DISPATCHED_TASKS.has(task.id)) continue;

        const agentId = task.assigned_agent_id.toLowerCase();
        const taskType = task.type || "code";
        
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

        const queueKey = `agent:assignments:${agentId}`;
        await redis.lpush(queueKey, JSON.stringify(taskPayload));
        
        // ATLAS-P0B-FIX-001: Removed task_queue and task:{id} writes
        // Workers consume directly from agent:assignments queues
        // This prevents orphaned task IDs without payloads

        // ATLAS-P0-FIX-001: DO NOT update status to "in_progress" here
        DISPATCHED_TASKS.add(task.id);
        console.log(`[TaskDispatcher] ✓ Dispatched task ${task.id.slice(0,8)} to ${agentId} (${taskType})`);
      }
    } catch (supabaseError) {
      console.error("[TaskDispatcher] Supabase connection failed, using Redis-only mode:", (supabaseError as Error).message);
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
