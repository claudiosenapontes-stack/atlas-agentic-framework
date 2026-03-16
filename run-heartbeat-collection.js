#!/usr/bin/env node

// Auto-generated runner for agent heartbeat collection
const { collectHeartbeats } = require('./services/heartbeat/agent-heartbeat.js');

async function runHeartbeats() {
  try {
    const result = await collectHeartbeats();
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error('Fatal error during heartbeat collection:', err);
    process.exit(1);
  }
}

runHeartbeats();