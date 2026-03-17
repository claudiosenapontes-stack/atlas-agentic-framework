/**
 * Atlas PM2 Ecosystem Configuration
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * ATLAS-COMMS-SAFETY-HOTFIX-601
 */

module.exports = {
  apps: [
    {
      name: 'mc-api-server',
      script: './api-server.js',
      cwd: '/root/clawd-severino/mission-control',
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '60s',
      autorestart: true,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        TZ: 'America/New_York'
      }
    },
    {
      name: 'mission-control',
      script: './node_modules/.bin/next',
      args: 'start --port 3000',
      cwd: '/root/.openclaw/workspaces/atlas-agentic-framework',
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '30s',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'health-aggregator',
      script: './runtime/agent-health-collector.js',
      cwd: '/root/.openclaw/workspaces/severino',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      autorestart: true,
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'agent-runtime',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'command-bus',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'event-pipeline',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'agent-auto-scaler',
      script: './runtime/agent-auto-scaler.js',
      cwd: '/root/.openclaw/runtime',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      autorestart: true,
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'auto-scaler',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'agent-spawner',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'result-aggregator',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    },
    {
      name: 'chat-bridge',
      env: {
        TZ: 'America/New_York',
        COMMS_SAFE_MODE: 'true'
      }
    }
  ]
};
