#!/usr/bin/env node
/**
 * Task Dispatcher Standalone Service
 * ATLAS-9925: Bridges Supabase → Redis for worker consumption
 * 
 * Usage: node scripts/task-dispatcher-service.js
 */

const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');

// Configuration from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const POLL_INTERVAL_MS = parseInt(process.env.DISPATCHER_POLL_INTERVAL || '3000');
const MAX_DISPATCH_PER_CYCLE = 10;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[TaskDispatcher] ERROR: Missing Supabase credentials');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const redis = createRedisClient({
  url: REDIS_URL,
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) }
});

const DISPATCHED_TASKS = new Set();
let isRunning = true;

async function connect() {
  redis.on('error', (err) => console.error('[TaskDispatcher] Redis error:', err));
  await redis.connect();
  console.log('[TaskDispatcher] Connected to Redis');
}

async function pollAndDispatch() {
  if (!isRunning) return;

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, assigned_agent_id, mission_id, priority, execution_id')
      .eq('status', 'pending')
      .not('assigned_agent_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(MAX_DISPATCH_PER_CYCLE);

    if (error) {
      console.error('[TaskDispatcher] Query error:', error);
      return;
    }

    if (!tasks || tasks.length === 0) return;

    console.log(`[TaskDispatcher] Found ${tasks.length} pending task(s)`);

    for (const task of tasks) {
      if (DISPATCHED_TASKS.has(task.id)) continue;

      const agentId = task.assigned_agent_id.toLowerCase();
      
      // Infer task type from agent or title (since 'type' column doesn't exist)
      let taskType = 'code';
      const titleLower = (task.title || '').toLowerCase();
      if (titleLower.includes('research') || agentId === 'einstein') taskType = 'research';
      else if (titleLower.includes('strategy') || agentId === 'henry') taskType = 'strategy';
      else if (titleLower.includes('orchestrate') || agentId === 'henry') taskType = 'orchestrate';
      else if (titleLower.includes('legal') || agentId === 'harvey') taskType = 'legal';
      
      const taskPayload = {
        id: task.id,
        type: taskType,
        title: task.title,
        description: task.description,
        assigned_agent_id: agentId,
        mission_id: task.mission_id,
        priority: task.priority || 'medium',
        execution_id: task.execution_id,
        status: 'queued',
        target_agents: [agentId],
        enqueued_at: new Date().toISOString(),
      };

      // Push to agent's assignment queue (list for FIFO)
      // Note: Redis v4+ uses lPush instead of lpush
      const queueKey = `agent:assignments:${agentId}`;
      await redis.lPush(queueKey, JSON.stringify(taskPayload));
      
      // Priority queue - use zAdd for sorted set
      const score = task.priority === 'critical' ? 100 : task.priority === 'high' ? 50 : 10;
      await redis.zAdd('task_queue', { score, value: task.id });
      
      // Store full task data
      await redis.set(`task:${task.id}`, JSON.stringify(taskPayload));

      // Update task status to "in_progress" (worker will pick it up)
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', task.id);

      if (updateError) {
        console.error(`[TaskDispatcher] Failed to update task ${task.id}:`, updateError);
        continue;
      }

      DISPATCHED_TASKS.add(task.id);
      console.log(`[TaskDispatcher] ✓ Dispatched ${task.id.slice(0,8)} → ${agentId} (${taskType})`);
    }

  } catch (error) {
    console.error('[TaskDispatcher] Poll error:', error);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  ATLAS Task Dispatcher Service                     ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Redis: ${REDIS_URL}`);
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log('');

  await connect();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[TaskDispatcher] Shutting down...');
    isRunning = false;
    await redis.quit();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[TaskDispatcher] SIGTERM received, shutting down...');
    isRunning = false;
    await redis.quit();
    process.exit(0);
  });

  // Start polling
  console.log('[TaskDispatcher] Starting poll loop...');
  setInterval(pollAndDispatch, POLL_INTERVAL_MS);
  
  // Initial poll
  await pollAndDispatch();
}

main().catch(err => {
  console.error('[TaskDispatcher] Fatal error:', err);
  process.exit(1);
});
