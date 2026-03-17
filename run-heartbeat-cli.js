const { collectHeartbeats } = require('./services/heartbeat/agent-heartbeat.js');

collectHeartbeats()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
