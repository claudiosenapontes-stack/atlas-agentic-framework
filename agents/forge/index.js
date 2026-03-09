#!/usr/bin/env node

/**
 * Forge Agent - Code Generation & Implementation Specialist
 * 
 * This agent handles coding tasks, architecture design, and refactoring.
 */

const Redis = require('ioredis');

// Load config from environment
const config = {
  agentId: process.env.AGENT_ID || 'forge-unknown',
  agentName: process.env.AGENT_NAME || 'Forge',
  agentType: process.env.AGENT_TYPE || 'forge',
  taskId: process.env.TASK_ID || null,
  context: JSON.parse(process.env.AGENT_CONTEXT || '{}'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',
};

console.log(`[${config.agentName}] Starting...`);
console.log(`[${config.agentName}] Task ID: ${config.taskId}`);

// Connect to Redis
const redis = new Redis(config.redisUrl);

// Handle shutdown gracefully
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`[${config.agentName}] Received ${signal}, shutting down...`);
  
  // Update presence to offline
  await redis.hset(`presence:agent:${config.agentId}`, {
    status: 'offline',
    stopped_at: new Date().toISOString(),
  });
  
  await redis.expire(`presence:agent:${config.agentId}`, 60);
  await redis.quit();
  
  console.log(`[${config.agentName}] Shutdown complete`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Main agent loop
async function main() {
  try {
    // Register presence
    await redis.hset(`presence:agent:${config.agentId}`, {
      status: 'online',
      agent_type: config.agentType,
      task_id: config.taskId || '',
      started_at: new Date().toISOString(),
      pid: process.pid.toString(),
    });
    await redis.expire(`presence:agent:${config.agentId}`, 300);

    console.log(`[${config.agentName}] Online (PID: ${process.pid})`);

    // If assigned to a task, start working
    if (config.taskId) {
      console.log(`[${config.agentName}] Starting work on task: ${config.taskId}`);
      
      // Publish event that agent started task
      await redis.publish('event:agent.task.started', JSON.stringify({
        agent_id: config.agentId,
        agent_name: config.agentName,
        task_id: config.taskId,
        timestamp: new Date().toISOString(),
      }));

      // Simulate work loop
      let progress = 0;
      const workInterval = setInterval(async () => {
        if (isShuttingDown) {
          clearInterval(workInterval);
          return;
        }

        progress += Math.random() * 10;
        if (progress > 100) progress = 100;

        // Update presence with current work
        await redis.hset(`presence:agent:${config.agentId}`, {
          status: 'online',
          current_task: config.context.subtask || `Working on ${config.taskId}`,
          progress: progress.toFixed(1),
          last_update: new Date().toISOString(),
        });

        console.log(`[${config.agentName}] Progress: ${progress.toFixed(1)}%`);

        if (progress >= 100) {
          clearInterval(workInterval);
          console.log(`[${config.agentName}] Task complete`);
          
          await redis.publish('event:agent.task.completed', JSON.stringify({
            agent_id: config.agentId,
            task_id: config.taskId,
            timestamp: new Date().toISOString(),
          }));
        }
      }, 5000);
    }

    // Keepalive loop
    setInterval(async () => {
      if (isShuttingDown) return;
      
      await redis.hset(`presence:agent:${config.agentId}`, {
        last_seen: new Date().toISOString(),
      });
    }, 30000);

  } catch (error) {
    console.error(`[${config.agentName}] Error:`, error);
    process.exit(1);
  }
}

main();
