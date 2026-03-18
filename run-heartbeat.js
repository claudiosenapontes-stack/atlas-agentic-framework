#!/usr/bin/env node

const { collectHeartbeats } = require('./services/heartbeat/agent-heartbeat.js');

// Execute heartbeat collection
async function run() {
  try {
    const result = await collectHeartbeats();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Heartbeat collection failed:', error);
    process.exit(1);
  }
}

run();