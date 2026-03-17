if (process.env.SUPABASE_URL === undefined) {
  console.error('SUPABASE_URL not set in environment');
  process.exit(1);
}

if (process.env.SUPABASE_SERVICE_KEY === undefined) {
  console.error('SUPABASE_SERVICE_KEY not set in environment');
  process.exit(1);
}

console.log('Environment check passed, starting heartbeat collection...');

const { collectHeartbeats } = require('./services/heartbeat/agent-heartbeat.js');

collectHeartbeats()
  .then(result => {
    console.log('Heartbeat collection completed:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Heartbeat collection failed:', error);
    process.exit(1);
  });