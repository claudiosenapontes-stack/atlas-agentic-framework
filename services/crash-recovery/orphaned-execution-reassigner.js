/**
 * G5B M3 - Orphaned Execution Reassigner
 * Requeues executions from dead workers
 */

const { createClient } = require('@supabase/supabase-js');

class OrphanedExecutionReassigner {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.pollIntervalMs = config.pollIntervalMs || 5000;
    this.batchSize = config.batchSize || 20;
    this.isRunning = false;
  }

  async start() {
    console.log('[OrphanedExecutionReassigner] Starting...');
    this.isRunning = true;
    this.processingLoop();
    
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async processingLoop() {
    while (this.isRunning) {
      try {
        await this.processWorkerExpiryEvents();
        await this.processOrphanedExecutions();
      } catch (err) {
        console.error('[OrphanedExecutionReassigner] Error:', err);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  async processWorkerExpiryEvents() {
    const { data: events, error } = await this.supabase
      .from('execution_events')
      .select('*')
      .eq('event_type', 'monitor_worker_expired')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(this.batchSize);

    if (error) {
      console.error('[OrphanedExecutionReassigner] Event fetch error:', error);
      return;
    }

    for (const event of events || []) {
      const payload = event.payload || {};
      
      if (payload.execution_id) {
        await this.requeueOrphanedExecution(
          payload.execution_id,
          payload.task_id,
          payload.worker_id
        );
      }

      await this.supabase
        .from('execution_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', event.id);
    }
  }

  async processOrphanedExecutions() {
    const { data: orphans, error } = await this.supabase
      .from('executions')
      .select(`
        id,
        task_id,
        lease_owner,
        status,
        heartbeat_at,
        retry_count,
        max_attempts
      `)
      .eq('status', 'in_progress')
      .not('lease_owner', 'is', null)
      .limit(this.batchSize);

    if (error) {
      console.error('[OrphanedExecutionReassigner] Orphan query error:', error);
      return;
    }

    for (const execution of orphans || []) {
      const { data: worker } = await this.supabase
        .from('worker_heartbeats')
        .select('status')
        .eq('worker_id', execution.lease_owner)
        .single();

      if (worker && worker.status === 'expired') {
        console.log(`[OrphanedExecutionReassigner] Found orphan: ${execution.id.slice(0, 8)}`);
        await this.requeueOrphanedExecution(
          execution.id,
          execution.task_id,
          execution.lease_owner
        );
      }
    }
  }

  async requeueOrphanedExecution(executionId, taskId, deadWorkerId) {
    const { error: updateError } = await this.supabase
      .from('executions')
      .update({
        lease_owner: null,
        lease_expires_at: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (updateError) {
      console.error('[OrphanedExecutionReassigner] Release error:', updateError);
      return;
    }

    const { data: existing } = await this.supabase
      .from('retry_queue')
      .select('id')
      .eq('execution_id', executionId)
      .eq('status', 'pending')
      .single();

    if (!existing) {
      await this.supabase
        .from('retry_queue')
        .insert({
          execution_id: executionId,
          task_id: taskId,
          attempt_number: 1,
          max_attempts: 3,
          backoff_type: 'fixed',
          base_delay_ms: 2000,
          current_delay_ms: 2000,
          status: 'pending',
          execute_after: new Date(Date.now() + 2000).toISOString(),
          failure_class: 'worker_lost',
          last_error: `Worker ${deadWorkerId} expired`,
          created_at: new Date().toISOString()
        });
    }

    await this.writeRecoveryEvent('execution_reassigned', executionId, taskId, deadWorkerId);
    console.log(`[OrphanedExecutionReassigner] Requeued ${executionId.slice(0, 8)}`);
  }

  async writeRecoveryEvent(eventType, executionId, taskId, workerId) {
    const { error } = await this.supabase
      .from('recovery_events')
      .insert({
        event_type: eventType,
        execution_id: executionId,
        task_id: taskId,
        worker_id: workerId,
        details: {
          reassigned_at: new Date().toISOString(),
          fast_retry: true
        },
        status: 'processed',
        created_at: new Date().toISOString()
      });

    if (error) console.error('[OrphanedExecutionReassigner] Recovery event write failed:', error);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('[OrphanedExecutionReassigner] Stopping...');
    this.isRunning = false;
  }
}

if (require.main === module) {
  const reassigner = new OrphanedExecutionReassigner({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY
  });
  reassigner.start();
}

module.exports = OrphanedExecutionReassigner;
