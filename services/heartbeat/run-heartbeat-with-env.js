// Load environment from .env file
const fs = require('fs');

const envContent = fs.readFileSync('/root/.openclaw/workspaces/atlas-agentic-framework/.env', 'utf8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.+)$/);
  if (match) {
    let value = match[2];
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) {
      process.env[match[1]] = value;
    }
  }
}

// Map SUPABASE_KEY to SUPABASE_SERVICE_KEY for agent-heartbeat.js compatibility
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// Now run the heartbeat collection
const { collectHeartbeats } = require('./agent-heartbeat.js');

collectHeartbeats().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
