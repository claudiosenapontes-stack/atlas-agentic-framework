/**
 * G5B M3 - Worker Heartbeat Monitor
 * Detects stale/expired workers and emits events
 */

const { createClient } = require('@supabase/supabase-js');

class WorkerHeartbeatMonitor {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.workerId = config.workerId || `monitor-${Date.now()}`;
    this.checkIntervalMs = config.checkIntervalMs || 5000;
    this.staleThresholdSec = config.staleThresholdSec || 60;
    this.expiredThresholdSec = config.expiredThresholdSec || 120;
    this.batchSize = config.batchSize || 50;
    this.isRunning = false;
  }

  async start() {
    console.log(`[WorkerHeartbeatMonitor] Starting ${this.workerId}`);
    this.isRunning = true;
    
    await this.registerMonitor();
    this.monitorLoop();
    
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async registerMonitor() {
    const { error } = await this.supabase
      .from('worker_heartbeats')
      .upsert({
        worker_id: this.workerId,
        worker_type: 'monitor',
        last_heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
        status: 'active',
        metadata: { started_at: new Date().toISOString() }
      }, { onConflict: 'worker_id' });

    if (error) console.error('[WorkerHeartbeatMonitor] Registration failed:', error);
    else console.log('[WorkerHeartbeatMonitor] Registered');
  }

  async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.checkStaleWorkers();
        await this.checkExpiredWorkers();
        await this.updateOwnHeartbeat();
      } catch (err) {
        console.error('[WorkerHeartbeatMonitor] Loop error:', err);
      }
      await this.sleep(this.checkIntervalMs);
    }
  }

  async checkStaleWorkers() {
    const staleThreshold = new Date(Date.now() - this.staleThresholdSec * 1000).toISOString();
    
    const { data: staleWorkers, error } = await this.supabase
      .from('worker_heartbeats')
      .select('*')
      .eq('status', 'active')
      .lt('last_heartbeat_at', staleThreshold);

    if (error) {
      console.error('[WorkerHeartbeatMonitor] Stale check error:', error);
      return;
    }

    for (const worker of staleWorkers || []) {
      console.log(`[WorkerHeartbeatMonitor] Marking stale: ${worker.worker_id}`);
      
      await this.supabase
        .from('worker_heartbeats')
        .update({ status: 'stale', updated_at: new Date().toISOString() })
        .eq('worker_id', worker.worker_id);

      await this.emitEvent('worker_stale', {
        worker_id: worker.worker_id,
        last_heartbeat: worker.last_heartbeat_at,
        current_execution: worker.current_execution_id
      });
    }
  }

  async checkExpiredWorkers() {
    const expiredThreshold = new Date(Date.now() - this.expiredThresholdSec * 1000).toISOString();
    
    const { data: expiredWorkers, error } = await this.supabase
      .from('worker_heartbeats')
      .select('*')
      .in('status', ['stale', 'active'])
      .lt('last_heartbeat_at', expiredThreshold);

    if (error) {
      console.error('[WorkerHeartbeatMonitor] Expired check error:', error);
      return;
    }

    for (const worker of expiredWorkers || []) {
      console.log(`[WorkerHeartbeatMonitor] Marking expired: ${worker.worker_id}`);
      
      await this.supabase
        .from('worker_heartbeats')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('worker_id', worker.worker_id);

      await this.emitEvent('worker_expired', {
        worker_id: worker.worker_id,
        execution_id: worker.current_execution_id,
        task_id: worker.current_task_id
      });

      await this.writeRecoveryEvent('worker_expired', worker);
    }
  }

  async writeRecoveryEvent(eventType, worker) {
    const { error } = await this.supabase
      .from('recovery_events')
      .insert({
        event_type: eventType,
        worker_id: worker.worker_id,
        execution_id: worker.current_execution_id,
        task_id: worker.current_task_id,
        details: {
          last_heartbeat: worker.last_heartbeat_at,
          worker_type: worker.worker_type
        },
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) console.error('[WorkerHeartbeatMonitor] Recovery event write failed:', error);
    else console.log(`[WorkerHeartbeatMonitor] Recovery event written for ${worker.worker_id}`);
  }

  async emitEvent(eventType, payload) {
    await this.supabase
      .from('execution_events')
      .insert({
        execution_id: '00000000-0000-0000-0000-000000000000',
        event_type: `monitor_${eventType}`,
        payload: payload,
        created_at: new Date().toISOString()
      });
  }

  async updateOwnHeartbeat() {
    await this.supabase
      .from('worker_heartbeats')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString()
      })
      .eq('worker_id', this.workerId);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    console.log('[WorkerHeartbeatMonitor] Stopping...');
    this.isRunning = false;
    await this.supabase
      .from('worker_heartbeats')
      .update({ status: 'shutdown' })
      .eq('worker_id', this.workerId);
  }
}

if (require.main === module) {
  const monitor = new WorkerHeartbeatMonitor({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
    workerId: process.env.WORKER_ID || `heartbeat-monitor-${Date.now()}`
  });
  monitor.start();
}

module.exports = WorkerHeartbeatMonitor;
