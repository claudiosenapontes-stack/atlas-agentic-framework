/**
 * ATLAS-9930 Phase 1: /api/agents/profiles
 * Returns real agent data from PM2 processes
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

interface AgentProfile {
  id: string;
  name: string;
  displayName: string;
  status: 'online' | 'offline' | 'error' | 'busy';
  uptime: number; // seconds
  currentTask: string | null;
  queueDepth: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  pid: number | null;
  restarts: number;
  lastSeen: string;
  handlers: string[];
}

async function getPM2ProcessList(): Promise<any[]> {
  try {
    const output = execSync('pm2 jlist', { encoding: 'utf-8', timeout: 5000 });
    return JSON.parse(output);
  } catch (e) {
    console.error('Failed to get PM2 process list:', e);
    return [];
  }
}

async function getAgentQueueDepth(agentId: string): Promise<number> {
  try {
    const depth = await redis.llen(`agent:assignments:${agentId}`);
    return depth;
  } catch {
    return 0;
  }
}

async function getAgentCurrentTask(agentId: string): Promise<string | null> {
  try {
    const taskJson = await redis.get(`agent:${agentId}:current_task`);
    if (taskJson) {
      const task = JSON.parse(taskJson);
      return task.title || task.id;
    }
    return null;
  } catch {
    return null;
  }
}

function mapAgentConfig(agentId: string): { displayName: string; handlers: string[]; color: string } {
  const configs: Record<string, any> = {
    'henry': {
      displayName: 'Henry',
      handlers: ['fleet', 'operations', 'audit', 'coordinate'],
      color: 'blue'
    },
    'optimus': {
      displayName: 'Optimus',
      handlers: ['code', 'development', 'api', 'orchestrate', 'architecture'],
      color: 'purple'
    },
    'optimus-prime': {
      displayName: 'Optimus Prime',
      handlers: ['code', 'autonomy', 'control', 'deployment', 'orchestrate', 'research'],
      color: 'indigo'
    },
    'prime': {
      displayName: 'Prime',
      handlers: ['deployment', 'infrastructure', 'monitoring'],
      color: 'violet'
    },
    'olivia': {
      displayName: 'Olivia',
      handlers: ['ui', 'frontend', 'design', 'testing'],
      color: 'pink'
    },
    'sophia': {
      displayName: 'Sophia',
      handlers: ['data', 'analytics', 'research', 'content'],
      color: 'emerald'
    },
    'harvey': {
      displayName: 'Harvey',
      handlers: ['legal', 'compliance', 'contracts'],
      color: 'red'
    },
    'einstein': {
      displayName: 'Einstein',
      handlers: ['research', 'analysis', 'math', 'science'],
      color: 'cyan'
    },
    'severino': {
      displayName: 'Severino',
      handlers: ['mcp', 'integration', 'tools'],
      color: 'orange'
    }
  };
  
  return configs[agentId] || {
    displayName: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    handlers: [],
    color: 'gray'
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get PM2 process data
    const pm2Processes = await getPM2ProcessList();
    
    // Define all known agents
    const knownAgents = [
      'henry', 'optimus', 'optimus-prime', 'prime', 
      'olivia', 'sophia', 'harvey', 'einstein', 'severino'
    ];
    
    // Build profiles
    const profiles: AgentProfile[] = await Promise.all(
      knownAgents.map(async (agentId) => {
        // Find PM2 process for this agent
        const pm2Proc = pm2Processes.find(p => 
          p.name === `worker-${agentId}` || 
          (agentId === 'optimus-prime' && p.name === 'worker-optimus-prime')
        );
        
        const config = mapAgentConfig(agentId);
        
        if (pm2Proc) {
          // Agent is running
          const pm = pm2Proc.pm2_env;
          const monit = pm2Proc.monit || {};
          
          // Calculate uptime
          const uptimeSeconds = pm.pm_uptime 
            ? Math.floor((Date.now() - pm.pm_uptime) / 1000)
            : 0;
          
          // Determine status
          let status: AgentProfile['status'] = 'offline';
          if (pm.status === 'online') status = 'online';
          else if (pm.status === 'stopping' || pm.status === 'stopped') status = 'offline';
          else if (pm.status === 'errored') status = 'error';
          
          // Check if busy with task
          const currentTask = await getAgentCurrentTask(agentId);
          if (currentTask) status = 'busy';
          
          return {
            id: agentId,
            name: pm2Proc.name,
            displayName: config.displayName,
            status,
            uptime: uptimeSeconds,
            currentTask,
            queueDepth: await getAgentQueueDepth(agentId),
            memoryUsage: Math.round((monit.memory || 0) / 1024 / 1024), // Convert to MB
            cpuUsage: monit.cpu || 0,
            pid: pm.pid || null,
            restarts: pm.restart_time || 0,
            lastSeen: new Date(pm.pm_uptime || Date.now()).toISOString(),
            handlers: config.handlers
          };
        } else {
          // Agent not running
          return {
            id: agentId,
            name: `worker-${agentId}`,
            displayName: config.displayName,
            status: 'offline',
            uptime: 0,
            currentTask: null,
            queueDepth: await getAgentQueueDepth(agentId),
            memoryUsage: 0,
            cpuUsage: 0,
            pid: null,
            restarts: 0,
            lastSeen: null,
            handlers: config.handlers
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      agents: profiles,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    console.error('Error fetching agent profiles:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
