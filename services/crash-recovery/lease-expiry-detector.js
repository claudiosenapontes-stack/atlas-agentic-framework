/**
 * G5B M3 - Lease Expiry Detector
 * Finds expired leases and releases them
 */

const { createClient } = require('@supabase/supabase-js');

class LeaseExpiryDetector {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.checkIntervalMs = config.checkIntervalMs || 10000;
    this.batchSize = config.batchSize || 50;
    this.isRunning = false;
  }

  async start() {
    console.log('[LeaseExpiryDetector] Starting...');
    this.isRunning = true;
    this.detectionLoop();
    
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async detectionLoop() {
    while (this.isRunning) {
      try {
        await this.detectExpiredLeases();
      } catch (err) {
        console.error('[LeaseExpiryDetector] Error:', err);
      }
      await this.sleep(this.checkIntervalMs);
    }
  }

  async detectExpiredLeases() {
    const now = new Date().toISOString();
    
    const { data: expiredLeases, error } = await this.supabase
      .from('executions')
      .select('id, lease_owner, lease_expires_at, task_id, heartbeat_at, status, retry_count, max_attempts')
      .not('lease_owner', 'is', null)
      .lt('lease_expires_at', now)
      .eq('status', 'in_progress')
      .limit(this.batchSize);

    if (error) {
      console.error('[LeaseExpiryDetector] Query error:', error);
      return;
    }

    for (const execution of expiredLeases || []) {
      console.log(`[LeaseExpiryDetector] Expired lease: ${execution.id.slice(0, 8)} (was ${execution.lease_owner})`);
      
      await this.releaseLease(execution);
      await this.createRetryEntry(execution);
      await this.writeRecoveryEvent('lease_expired', execution);
    }
  }

  async releaseLease(execution) {
    const { error } = await this.supabase
      .from('executions')
      .update({
        lease_owner: null,
        lease_expires_at: null,
        status: 'pending',
        retry_count: (execution.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    if (error) {
      console.error('[LeaseExpiryDetector] Release error:', error);
    } else {
      console.log(`[LeaseExpiryDetector] Released lease for ${execution.id.slice(0, 8)}`);
    }
  }

  async createRetryEntry(execution) {
    const { data: existing } = await this.supabase
      .from('retry_queue')
      .select('id')
      .eq('execution_id', execution.id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      console.log(`[LeaseExpiryDetector] Retry already queued for ${execution.id.slice(0, 8)}`);
      return;
    }

    await this.supabase
      .from('retry_queue')
      .insert({
        execution_id: execution.id,
        task_id: execution.task_id,
        attempt_number: (execution.retry_count || 0) + 1,
        max_attempts: execution.max_attempts || 3,
        backoff_type: 'exponential',
        base_delay_ms: 5000,
        max_delay_ms: 60000,
        current_delay_ms: 5000,
        status: 'pending',
        execute_after: new Date(Date.now() + 5000).toISOString(),
        failure_class: 'lease_expired',
        created_at: new Date().toISOString()
      });

    console.log(`[LeaseExpiryDetector] Retry queued for ${execution.id.slice(0, 8)}`);
  }

  async writeRecoveryEvent(eventType, execution) {
    const { error } = await this.supabase
      .from('recovery_events')
      .insert({
        event_type: eventType,
        execution_id: execution.id,
        task_id: execution.task_id,
        worker_id: execution.lease_owner,
        details: {
          lease_expired_at: execution.lease_expires_at,
          last_heartbeat: execution.heartbeat_at,
          retry_count: execution.retry_count
        },
        status: 'processed',
        created_at: new Date().toISOString()
      });

    if (error) console.error('[LeaseExpiryDetector] Recovery event write failed:', error);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('[LeaseExpiryDetector] Stopping...');
    this.isRunning = false;
  }
}

if (require.main === module) {
  const detector = new LeaseExpiryDetector({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY
  });
  detector.start();
}

module.exports = LeaseExpiryDetector;
