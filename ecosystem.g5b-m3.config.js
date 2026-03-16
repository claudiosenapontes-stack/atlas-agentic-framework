module.exports = {
  apps: [
    {
      name: 'g5b-heartbeat-monitor',
      script: './services/crash-recovery/worker-heartbeat-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_ID: 'g5b-heartbeat-monitor-01'
      },
      log_file: './logs/g5b-heartbeat-monitor.log',
      out_file: './logs/g5b-heartbeat-monitor-out.log',
      error_file: './logs/g5b-heartbeat-monitor-error.log',
      merge_logs: true,
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10
    },
    {
      name: 'g5b-lease-detector',
      script: './services/crash-recovery/lease-expiry-detector.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: './logs/g5b-lease-detector.log',
      out_file: './logs/g5b-lease-detector-out.log',
      error_file: './logs/g5b-lease-detector-error.log',
      merge_logs: true,
      max_memory_restart: '256M',
      restart_delay: 5000
    },
    {
      name: 'g5b-orphan-reassigner',
      script: './services/crash-recovery/orphaned-execution-reassigner.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: './logs/g5b-orphan-reassigner.log',
      out_file: './logs/g5b-orphan-reassigner-out.log',
      error_file: './logs/g5b-orphan-reassigner-error.log',
      merge_logs: true,
      max_memory_restart: '256M',
      restart_delay: 5000
    }
  ]
};
