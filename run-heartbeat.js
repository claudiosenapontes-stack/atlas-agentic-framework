// ATLAS-FLEET-HEARTBEAT-CRON-502
// Node.js runner for agent heartbeat collection
const path = require('path');

// Set process.cwd to the project root
process.chdir(__dirname);

// Set environment variables
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukuicfswabcaioszcunb.supabase.co';

console.log('[HeartbeatCron] Starting ATLAS-FLEET-HEARTBEAT-CRON-502 collection at', new Date().toISOString());

// Import and run the heartbeat collection
import('./services/heartbeat/agent-heartbeat.ts')
  .then(async (module) => {
    try {
      const result = await module.collectHeartbeats();
      console.log('[HeartbeatCron] Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('[HeartbeatCron] Error during heartbeat collection:', error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('[HeartbeatCron] Failed to load heartbeat module:', error);
    process.exit(1);
  });