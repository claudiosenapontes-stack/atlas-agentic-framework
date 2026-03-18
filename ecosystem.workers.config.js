/**
 * ATLAS-9930: Worker Ecosystem Configuration
 * Real AI execution with proper environment
 */

const path = require('path');

// Environment variables for all workers
const workerEnv = {
  TZ: 'America/New_York',
  SUPABASE_URL: 'https://ukuicfswabcaioszcunb.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWxvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWxvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  PYTHONPATH: '/root/clawd-severino/scripts'
};

function createWorker(agent, interval = 3) {
  return {
    name: `worker-${agent}`,
    script: './agent_worker.py',
    cwd: '/root/clawd-severino/scripts',
    interpreter: 'python3',
    args: `${agent} --interval ${interval}`,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '30s',
    autorestart: true,
    kill_timeout: 5000,
    env: workerEnv,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: `/root/.openclaw/logs/worker-${agent}-error.log`,
    out_file: `/root/.openclaw/logs/worker-${agent}-out.log`,
    combine_logs: true
  };
}

module.exports = {
  apps: [
    createWorker('henry', 3),
    createWorker('optimus', 3),
    createWorker('optimus-prime', 3),
    createWorker('prime', 3),
    createWorker('olivia', 3),
    createWorker('sophia', 3),
    createWorker('harvey', 3),
    createWorker('einstein', 3),
    createWorker('severino', 3)
  ]
};
