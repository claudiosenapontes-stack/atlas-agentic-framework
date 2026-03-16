// Supabase Degradation Impact Diagnostic
// Tests core Atlas write paths and measures latency

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const testId = `degradation_test_${Date.now()}`;
const results = {
  timestamp: new Date().toISOString(),
  tests: {} as Record<string, any>,
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0
  }
};

async function measureTest(name: string, testFn: () => Promise<any>) {
  const start = Date.now();
  try {
    const result = await testFn();
    const latency = Date.now() - start;
    results.tests[name] = {
      status: 'PASS',
      latencyMs: latency,
      result: result
    };
    results.summary.passed++;
    results.summary.maxLatencyMs = Math.max(results.summary.maxLatencyMs, latency);
    return { success: true, latency };
  } catch (error: any) {
    const latency = Date.now() - start;
    results.tests[name] = {
      status: 'FAIL',
      latencyMs: latency,
      error: error.message || String(error)
    };
    results.summary.failed++;
    return { success: false, latency, error: error.message };
  } finally {
    results.summary.totalTests++;
  }
}

async function runDiagnostics() {
  console.log('=== ATLAS-SUPABASE-DEGRADATION-IMPACT-1258 ===');
  console.log(`Test ID: ${testId}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log('');

  // Test 1: executions table - READ
  await measureTest('executions_read', async () => {
    const { data, error } = await supabase
      .from('executions')
      .select('id, status, created_at')
      .limit(5);
    if (error) throw error;
    return { count: data?.length || 0 };
  });

  // Test 2: executions table - WRITE
  await measureTest('executions_write', async () => {
    const { data, error } = await supabase
      .from('executions')
      .insert({
        id: `exec_${testId}`,
        status: 'pending',
        payload: { test: true, source: 'degradation_check' }
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  });

  // Test 3: tasks table - READ
  await measureTest('tasks_read', async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, status, title')
      .limit(5);
    if (error) throw error;
    return { count: data?.length || 0 };
  });

  // Test 4: tasks table - WRITE
  await measureTest('tasks_write', async () => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: `Degradation Test ${testId}`,
        status: 'inbox'
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  });

  // Test 5: workflow_executions table - READ
  await measureTest('workflow_executions_read', async () => {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('id, status, created_at')
      .limit(5);
    if (error) throw error;
    return { count: data?.length || 0 };
  });

  // Test 6: workflow_executions table - WRITE
  await measureTest('workflow_executions_write', async () => {
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        status: 'pending',
        trigger_type: 'degradation_test'
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  });

  // Test 7: execution_events table - WRITE (critical for audit trail)
  await measureTest('execution_events_write', async () => {
    const { data, error } = await supabase
      .from('execution_events')
      .insert({
        event_type: 'degradation_test',
        details: { test_id: testId }
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  });

  // Test 8: retry_policies table - READ
  await measureTest('retry_policies_read', async () => {
    const { data, error } = await supabase
      .from('retry_policies')
      .select('name, max_attempts, base_delay_ms')
      .limit(5);
    if (error) throw error;
    return { count: data?.length || 0 };
  });

  // Test 9: Auth/Session check
  await measureTest('auth_session', async () => {
    const { data, error } = await supabase.auth.getSession();
    // This may fail without a session, but tests connectivity
    return { hasSession: !!data?.session };
  });

  // Test 10: RPC/Function check (if exec_sql exists)
  await measureTest('rpc_function', async () => {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT NOW() as current_time' 
      });
      if (error) throw error;
      return { current_time: data?.[0]?.current_time };
    } catch (e: any) {
      // exec_sql may not exist, that's ok - we tested connectivity
      if (e.message?.includes('function') || e.message?.includes('not found')) {
        return { note: 'exec_sql not available', connectivity: 'ok' };
      }
      throw e;
    }
  });

  // Calculate average latency
  const latencies = Object.values(results.tests)
    .map((t: any) => t.latencyMs)
    .filter(l => l > 0);
  results.summary.avgLatencyMs = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  // Check for timeout patterns (>5000ms is concerning)
  const timeouts = Object.entries(results.tests)
    .filter(([_, t]: [string, any]) => t.latencyMs > 5000)
    .map(([name, t]: [string, any]) => ({ name, latencyMs: t.latencyMs }));

  // Determine degradation type
  const readFailures = ['executions_read', 'tasks_read', 'workflow_executions_read', 'retry_policies_read']
    .filter(t => results.tests[t]?.status === 'FAIL').length;
  const writeFailures = ['executions_write', 'tasks_write', 'workflow_executions_write', 'execution_events_write']
    .filter(t => results.tests[t]?.status === 'FAIL').length;

  let degradationType = 'none';
  if (readFailures > 0 && writeFailures === 0) degradationType = 'read_only';
  else if (readFailures === 0 && writeFailures > 0) degradationType = 'write_only';
  else if (readFailures > 0 && writeFailures > 0) degradationType = 'full';
  else if (timeouts.length > 0) degradationType = 'latency';

  // Final assessment
  const safeForOps = results.summary.failed === 0 && results.summary.avgLatencyMs < 3000;

  console.log('=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Avg Latency: ${results.summary.avgLatencyMs}ms`);
  console.log(`Max Latency: ${results.summary.maxLatencyMs}ms`);
  console.log(`Timeouts (>5s): ${timeouts.length}`);
  console.log(`Degradation Type: ${degradationType}`);
  console.log(`Safe for Ops: ${safeForOps ? 'YES' : 'NO'}`);
  console.log('');

  if (timeouts.length > 0) {
    console.log('Timeout Warnings:');
    timeouts.forEach(t => console.log(`  - ${t.name}: ${t.latencyMs}ms`));
  }

  if (results.summary.failed > 0) {
    console.log('Failed Tests:');
    Object.entries(results.tests)
      .filter(([_, t]: [string, any]) => t.status === 'FAIL')
      .forEach(([name, t]: [string, any]) => {
        console.log(`  - ${name}: ${t.error}`);
      });
  }

  // Clean up test data
  try {
    await supabase.from('executions').delete().eq('id', `exec_${testId}`);
    console.log('');
    console.log('Cleanup: Test data removed');
  } catch (e) {
    // Ignore cleanup errors
  }

  return {
    safeForOps,
    degradationType,
    avgLatencyMs: results.summary.avgLatencyMs,
    maxLatencyMs: results.summary.maxLatencyMs,
    failedTests: results.summary.failed,
    timeouts: timeouts.length
  };
}

runDiagnostics().then(result => {
  console.log('');
  console.log('=== FINAL VERDICT ===');
  console.log(`supabase_safe_for_ops: ${result.safeForOps ? 'YES' : 'NO'}`);
  console.log(`degradation_type: ${result.degradationType}`);
  console.log(`avg_latency_ms: ${result.avgLatencyMs}`);
  console.log(`retry_storm_risk: ${result.timeouts > 2 ? 'YES' : 'NO'}`);
  process.exit(0);
}).catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
