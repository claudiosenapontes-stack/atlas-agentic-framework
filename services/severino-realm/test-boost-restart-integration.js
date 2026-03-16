#!/usr/bin/env node
/**
 * ATLAS Boost Restart Integration Test
 * Protocol: ATLAS-SEVERINO-BOOST-RESTART-SERVICE-INTEGRATION-001
 */

const { BoostRestartService } = require('./boost-restart-integrated.js');
const fs = require('fs').promises;
const path = require('path');

async function runIntegrationTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ATLAS BOOST RESTART SERVICE - INTEGRATION TEST');
  console.log('  Protocol: ATLAS-SEVERINO-BOOST-RESTART-SERVICE-INTEGRATION-001');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load config
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  };

  const service = new BoostRestartService(config);
  
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {}
  };

  // TEST 1: Session State Capture
  console.log('TEST 1: Session State Capture');
  console.log('─────────────────────────────────────────────────────────────');
  
  const testAgent = 'test-restart-agent';
  const testSessionDir = `/root/.openclaw/agents/${testAgent}/sessions`;
  
  // Setup test environment
  await fs.mkdir(testSessionDir, { recursive: true });
  await fs.writeFile(
    path.join(testSessionDir, 'test-session-001.jsonl'),
    JSON.stringify({ session_id: 'test-session-001', messages: [{role: 'user', content: 'test'}] })
  );
  
  const beforeState = await service.captureSessionState(testAgent);
  console.log('✓ Before state captured:', JSON.stringify(beforeState, null, 2));
  
  testResults.tests.push({
    name: 'session_state_capture',
    passed: beforeState.sessionCount > 0,
    data: beforeState
  });

  // TEST 2: Context Compaction
  console.log('\nTEST 2: Context Compaction');
  console.log('─────────────────────────────────────────────────────────────');
  
  const compaction = await service.compactContext(testAgent, beforeState);
  console.log('✓ Context compacted:', JSON.stringify(compaction, null, 2));
  
  testResults.tests.push({
    name: 'context_compaction',
    passed: compaction.success,
    data: compaction
  });

  // TEST 3: Lock Release
  console.log('\nTEST 3: Lock Release');
  console.log('─────────────────────────────────────────────────────────────');
  
  const lockRelease = await service.releaseAgentLocks(testAgent);
  console.log('✓ Locks released:', JSON.stringify(lockRelease, null, 2));
  
  testResults.tests.push({
    name: 'lock_release',
    passed: lockRelease.success,
    data: lockRelease
  });

  // TEST 4: Real Session Termination
  console.log('\nTEST 4: Real Session Termination');
  console.log('─────────────────────────────────────────────────────────────');
  
  const termination = await service.terminateSessionReal(testAgent, 'test-restart-001');
  console.log('✓ Session terminated:', JSON.stringify(termination, null, 2));
  
  testResults.tests.push({
    name: 'session_termination',
    passed: termination.success && termination.archivedSessions.length > 0,
    data: termination
  });

  // Verify sessions were archived
  const archiveDir = path.join(testSessionDir, 'restart_archive', 'test-restart-001');
  const archivedFiles = await fs.readdir(archiveDir).catch(() => []);
  console.log(`  Archived files: ${archivedFiles.join(', ')}`);

  // TEST 5: Fresh Session Start
  console.log('\nTEST 5: Fresh Session Start');
  console.log('─────────────────────────────────────────────────────────────');
  
  const newSession = await service.startFreshSessionReal(testAgent, 'test-restart-001');
  console.log('✓ New session started:', JSON.stringify(newSession, null, 2));
  
  testResults.tests.push({
    name: 'fresh_session_start',
    passed: newSession.success && newSession.sessionId,
    data: newSession
  });

  // TEST 6: Restart Proof Verification
  console.log('\nTEST 6: Restart Proof Verification');
  console.log('─────────────────────────────────────────────────────────────');
  
  const afterState = await service.captureSessionState(testAgent);
  const proof = service.verifyRestartProof(beforeState, afterState, newSession);
  console.log('✓ Restart proof:', JSON.stringify(proof, null, 2));
  
  testResults.tests.push({
    name: 'restart_proof',
    passed: proof.sessionChanged && proof.newSessionMatches && proof.verified,
    data: proof
  });

  // TEST 7: Wave Configuration
  console.log('\nTEST 7: Wave Configuration');
  console.log('─────────────────────────────────────────────────────────────');
  
  console.log('Wave 1 (high-context):', service.waveConfig[1].agents.join(', '));
  console.log('Wave 2 (medium-context):', service.waveConfig[2].agents.join(', '));
  console.log('Wave 3 (support-quality):', service.waveConfig[3].agents.join(', '));
  console.log('Wave 4 (infrastructure):', service.waveConfig[4].agents.join(', '));
  console.log('Wave 5 (coordinator):', service.waveConfig[5].agents.join(', '));
  
  testResults.tests.push({
    name: 'wave_configuration',
    passed: Object.keys(service.waveConfig).length === 5,
    data: service.waveConfig
  });

  // SUMMARY
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const passed = testResults.tests.filter(t => t.passed).length;
  const total = testResults.tests.length;
  
  for (const test of testResults.tests) {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}: ${test.name}`);
  }
  
  console.log(`\n  Total: ${passed}/${total} tests passed`);
  
  testResults.summary = {
    total: total,
    passed: passed,
    failed: total - passed,
    success: passed === total
  };

  // Save test results
  const reportPath = '/root/.openclaw/workspaces/severino/memory/boost-restart-integration-test.json';
  await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n  Report saved: ${reportPath}`);

  // Cleanup test environment
  await fs.rm(`/root/.openclaw/agents/${testAgent}`, { recursive: true, force: true });
  console.log('  Test environment cleaned up');

  return testResults;
}

runIntegrationTest().then(results => {
  process.exit(results.summary.success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
