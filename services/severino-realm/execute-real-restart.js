#!/usr/bin/env node
/**
 * Execute Real Agent Restart with Full Proof
 */

// Load env from .env.local
require('fs').readFileSync('/root/.openclaw/workspaces/atlas-agentic-framework/.env.local', 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) process.env[key.trim()] = valueParts.join('=').trim();
  });

const { BoostRestartService } = require('./boost-restart-integrated.js');
const fs = require('fs').promises;

async function executeRealRestart(agentId) {
  console.log(`\n🔥 EXECUTING REAL RESTART: ${agentId}`);
  console.log('=' .repeat(60));

  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  const service = new BoostRestartService(config);

  // BEFORE STATE
  console.log('\n📸 BEFORE STATE:');
  const before = await service.captureSessionState(agentId);
  console.log(JSON.stringify(before, null, 2));

  // EXECUTE RESTART
  console.log('\n⚙️  EXECUTING RESTART...');
  const result = await service.boostRestart({
    agentId,
    reason: 'ATLAS-SEVERINO-BOOST-RESTART-SERVICE-INTEGRATION-001',
    skipCompaction: false
  });

  // AFTER STATE
  console.log('\n📸 AFTER STATE:');
  const after = await service.captureSessionState(agentId);
  console.log(JSON.stringify(after, null, 2));

  // RESULTS
  console.log('\n✅ RESTART RESULT:');
  console.log(JSON.stringify(result, null, 2));

  // VERIFICATION
  console.log('\n🔍 VERIFICATION:');
  const checks = [
    ['Session Changed', result.proof?.sessionChanged],
    ['New Session Valid', result.proof?.newSessionMatches],
    ['Restart Successful', result.success],
    ['New Session ID Present', !!result.newSessionId],
    ['Duration Recorded', result.durationMs > 0]
  ];

  for (const [name, passed] of checks) {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
  }

  // Save proof
  const proofData = {
    protocol: 'ATLAS-SEVERINO-BOOST-RESTART-SERVICE-INTEGRATION-001',
    agentId,
    timestamp: new Date().toISOString(),
    before,
    after,
    result,
    verified: checks.every(c => c[1])
  };

  const proofPath = `/root/.openclaw/workspaces/severino/memory/restart-proof-${agentId}-${Date.now()}.json`;
  await fs.writeFile(proofPath, JSON.stringify(proofData, null, 2));
  console.log(`\n💾 Proof saved: ${proofPath}`);

  return proofData;
}

const agentId = process.argv[2] || 'harvey';
executeRealRestart(agentId).catch(console.error);
