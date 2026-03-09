#!/usr/bin/env node

/**
 * Vector Agent - Data Analysis & Visualization Expert
 */

const Redis = require('ioredis');

const config = {
  agentId: process.env.AGENT_ID || 'vector-unknown',
  agentName: process.env.AGENT_NAME || 'Vector',
  agentType: process.env.AGENT_TYPE || 'vector',
  taskId: process.env.TASK_ID || null,
  context: JSON.parse(process.env.AGENT_CONTEXT || '{}'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};

console.log(`[${config.agentName}] Starting...`);

const redis = new Redis(config.redisUrl);
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`[${config.agentName}] Shutting down...`);
  await redis.hset(`presence:agent:${config.agentId}`, {
    status: 'offline',
    stopped_at: new Date().toISOString(),
  });
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function main() {
  await redis.hset(`presence:agent:${config.agentId}`, {
    status: 'online',
    agent_type: config.agentType,
    task_id: config.taskId || '',
    started_at: new Date().toISOString(),
    pid: process.pid.toString(),
  });
  await redis.expire(`presence:agent:${config.agentId}`, 300);

  console.log(`[${config.agentName}] Online (PID: ${process.pid})`);

  // Keepalive
  setInterval(async () => {
    if (isShuttingDown) return;
    await redis.hset(`presence:agent:${config.agentId}`, {
      last_seen: new Date().toISOString(),
    });
  }, 30000);
}

main();
