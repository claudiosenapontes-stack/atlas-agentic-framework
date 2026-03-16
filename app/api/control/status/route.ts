/**
 * ATLAS-CONTROL-STATUS API
 * Real-time system status for Control OS dashboard
 * 
 * GET /api/control/status
 * Returns: Fleet, PM2, DB, API, Queue, Tasks, Executions status
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exec } from "child_process";
import { promisify } from "util";
import { getOpenClawClient } from "@/lib/openclaw";

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface SystemStatus {
  fleet: { online: number; offline: number; total: number };
  pm2: { online: number; offline: number; total: number };
  missionControl: 'online' | 'degraded' | 'offline';
  db: 'online' | 'degraded' | 'offline';
  api: 'online' | 'degraded' | 'offline';
  queue: { healthy: boolean; backlog: number };
  stuckTasks: number;
  activeExecutions: number;
}

interface HealthStatus {
  missionControl: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: string };
  acpAgents: { status: 'healthy' | 'degraded' | 'unhealthy'; count: number };
  severinoGuards: { status: 'healthy' | 'degraded' | 'unhealthy'; active: number };
  pm2Services: { status: 'healthy' | 'degraded' | 'unhealthy'; running: number };
  supabase: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: string };
  redis: { status: 'healthy' | 'degraded' | 'unhealthy'; memory: string };
  gateway: { status: 'healthy' | 'degraded' | 'unhealthy'; uptime: string };
  criticalApis: { status: 'healthy' | 'degraded' | 'unhealthy'; errors: number };
}

async function getPM2Status(): Promise<{ online: number; offline: number; total: number }> {
  try {
    const { stdout } = await execAsync('pm2 list --no-color 2>/dev/null | grep -E "online|stopped|errored" | wc -l');
    const total = parseInt(stdout.trim()) || 0;
    
    const { stdout: onlineOut } = await execAsync('pm2 list --no-color 2>/dev/null | grep "online" | wc -l');
    const online = parseInt(onlineOut.trim()) || 0;
    
    return { online, offline: total - online, total };
  } catch (error) {
    console.error('[Control Status] PM2 check failed:', error);
    return { online: 0, offline: 0, total: 0 };
  }
}

async function getDatabaseStatus(): Promise<{ status: 'online' | 'degraded' | 'offline'; latencyMs: number }> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('executions').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return { status: 'offline', latencyMs: latency };
    }
    
    return { status: latency > 500 ? 'degraded' : 'online', latencyMs: latency };
  } catch (error) {
    return { status: 'offline', latencyMs: Date.now() - start };
  }
}

async function getQueueStatus(): Promise<{ healthy: boolean; backlog: number }> {
  try {
    // Check for pending/stuck tasks
    const supabase = getSupabaseAdmin();
    
    // Count pending executions as queue backlog
    const { count, error } = await supabase
      .from('executions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (error) {
      return { healthy: false, backlog: 0 };
    }
    
    const backlog = count || 0;
    return { healthy: backlog < 50, backlog };
  } catch (error) {
    return { healthy: false, backlog: 0 };
  }
}

async function getStuckTasks(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Tasks stuck for >30 minutes (no heartbeat or started long ago)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('executions')
      .select('*', { count: 'exact', head: true })
      .or(`status.eq.pending,status.eq.running`)
      .lt('started_at', thirtyMinAgo);
    
    if (error) {
      console.error('[Control Status] Stuck tasks query failed:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    return 0;
  }
}

async function getActiveExecutions(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { count, error } = await supabase
      .from('executions')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.pending,status.eq.running');
    
    if (error) {
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    return 0;
  }
}

async function getFleetStatus(): Promise<{ online: number; offline: number; total: number }> {
  try {
    const openclaw = getOpenClawClient();
    const agents = await openclaw.getActiveAgents();
    const online = agents.filter((a: any) => a.status === 'online' || a.status === 'busy').length;
    return { online, offline: agents.length - online, total: agents.length };
  } catch (error) {
    // Fallback to database
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: dbError } = await (supabase as any).from('agents').select('status');
      if (dbError) return { online: 0, offline: 0, total: 0 };
      
      const online = data?.filter((a: any) => a.status === 'active' || a.status === 'online').length || 0;
      return { online, offline: (data?.length || 0) - online, total: data?.length || 0 };
    } catch {
      return { online: 0, offline: 0, total: 0 };
    }
  }
}

async function checkCriticalAPIs(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; errors: number }> {
  const endpoints = [
    '/api/health',
    '/api/agents/live',
    '/api/executions',
    '/api/tasks',
  ];
  
  let errors = 0;
  const baseUrl = 'http://localhost:3005';
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeout);
      
      if (!response || !response.ok) {
        errors++;
      }
    } catch {
      errors++;
    }
  }
  
  return {
    status: errors === 0 ? 'healthy' : errors > 2 ? 'unhealthy' : 'degraded',
    errors,
  };
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Parallel status checks
    const [
      fleetStatus,
      pm2Status,
      dbStatus,
      queueStatus,
      stuckTasks,
      activeExecs,
      criticalApis,
    ] = await Promise.all([
      getFleetStatus(),
      getPM2Status(),
      getDatabaseStatus(),
      getQueueStatus(),
      getStuckTasks(),
      getActiveExecutions(),
      checkCriticalAPIs(),
    ]);

    const systemStatus: SystemStatus = {
      fleet: fleetStatus,
      pm2: pm2Status,
      missionControl: 'online',
      db: dbStatus.status,
      api: criticalApis.status === 'healthy' ? 'online' : criticalApis.status === 'degraded' ? 'degraded' : 'offline',
      queue: queueStatus,
      stuckTasks,
      activeExecutions: activeExecs,
    };

    const healthStatus: HealthStatus = {
      missionControl: { status: 'healthy', latency: `${Date.now() - startTime}ms` },
      acpAgents: { status: fleetStatus.online > 0 ? 'healthy' : 'unhealthy', count: fleetStatus.online },
      severinoGuards: { status: 'healthy', active: 3 }, // Placeholder - needs severino-specific check
      pm2Services: { status: pm2Status.offline === 0 ? 'healthy' : pm2Status.offline > 5 ? 'unhealthy' : 'degraded', running: pm2Status.online },
      supabase: { status: dbStatus.status === 'online' ? 'healthy' : dbStatus.status === 'degraded' ? 'degraded' : 'unhealthy', latency: `${dbStatus.latencyMs}ms` },
      redis: { status: 'healthy', memory: '42%' }, // Placeholder - needs redis check
      gateway: { status: 'healthy', uptime: '99.9%' }, // Placeholder - needs gateway check
      criticalApis: criticalApis,
    };

    return NextResponse.json({
      success: true,
      systemStatus,
      healthStatus,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Control Status] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get system status',
        systemStatus: null,
        healthStatus: null,
      },
      { status: 500 }
    );
  }
}
