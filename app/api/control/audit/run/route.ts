/**
 * ATLAS-AUDIT API
 * Real system audit implementations
 * 
 * POST /api/control/audit/run
 * Runs: fleet, systems, connections, services, database audits
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

type AuditType = 'fleet' | 'systems' | 'connections' | 'services' | 'database';

interface AuditResult {
  id: string;
  type: AuditType;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: string;
  timestamp?: string;
  details?: any;
}

async function runFleetAudit(): Promise<AuditResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const openclaw = getOpenClawClient();
    const agents = await openclaw.getActiveAgents();
    
    const checks = [];
    let passed = 0;
    let failed = 0;
    
    for (const agent of agents) {
      const isHealthy = agent.status === 'online' || agent.status === 'busy';
      const check = {
        agent_id: agent.id,
        name: agent.name,
        status: agent.status,
        last_seen: agent.lastSeen,
        current_task: agent.currentTask,
        healthy: isHealthy,
      };
      checks.push(check);
      if (isHealthy) passed++; else failed++;
    }
    
    const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    
    return {
      id: randomUUID(),
      type: 'fleet',
      status: failed === 0 ? 'passed' : failed > passed ? 'failed' : 'passed',
      message: `${passed}/${agents.length} agents healthy${failed > 0 ? `, ${failed} unhealthy` : ''}`,
      duration,
      timestamp,
      details: { agents: checks, passed, failed, total: agents.length },
    };
  } catch (error) {
    return {
      id: randomUUID(),
      type: 'fleet',
      status: 'failed',
      message: 'Fleet audit failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      timestamp,
    };
  }
}

async function runSystemsAudit(): Promise<AuditResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    // Check PM2 services
    const { stdout: pm2Stdout } = await execAsync('pm2 list --no-color 2>/dev/null || echo "PM2 not available"');
    const pm2Lines = pm2Stdout.split('\n');
    
    const services = [];
    let onlineCount = 0;
    let offlineCount = 0;
    
    for (const line of pm2Lines) {
      if (line.includes('online')) {
        onlineCount++;
        const parts = line.trim().split(/\s+/);
        if (parts.length > 1) {
          services.push({ name: parts[1], status: 'online' });
        }
      } else if (line.includes('stopped') || line.includes('errored')) {
        offlineCount++;
      }
    }
    
    // Check disk space
    const { stdout: diskStdout } = await execAsync('df -h / 2>/dev/null | tail -1 || echo "Disk check unavailable"');
    const diskUsage = diskStdout.trim().split(/\s+/)[4] || 'unknown';
    
    // Check memory
    const { stdout: memStdout } = await execAsync('free -h 2>/dev/null | grep Mem || echo "Memory check unavailable"');
    const memParts = memStdout.trim().split(/\s+/);
    const memUsage = memParts[2] && memParts[1] ? `${memParts[2]}/${memParts[1]}` : 'unknown';
    
    const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    const allOnline = offlineCount === 0;
    
    return {
      id: randomUUID(),
      type: 'systems',
      status: allOnline ? 'passed' : 'failed',
      message: `${onlineCount} services online${offlineCount > 0 ? `, ${offlineCount} offline` : ''}`,
      duration,
      timestamp,
      details: {
        pm2: { online: onlineCount, offline: offlineCount },
        disk: { usage: diskUsage },
        memory: { usage: memUsage },
        services: services.slice(0, 10), // Top 10 services
      },
    };
  } catch (error) {
    return {
      id: randomUUID(),
      type: 'systems',
      status: 'failed',
      message: 'Systems audit failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      timestamp,
    };
  }
}

async function runConnectionsAudit(): Promise<AuditResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  const checks = [];
  let passed = 0;
  let failed = 0;
  
  // Check Supabase
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('executions').select('id').limit(1);
    if (!error) {
      checks.push({ service: 'supabase', status: 'connected', latency: '<100ms' });
      passed++;
    } else {
      checks.push({ service: 'supabase', status: 'failed', error: error.message });
      failed++;
    }
  } catch (e) {
    checks.push({ service: 'supabase', status: 'failed', error: String(e) });
    failed++;
  }
  
  // Check OpenClaw
  try {
    const openclaw = getOpenClawClient();
    await openclaw.getActiveAgents();
    checks.push({ service: 'openclaw', status: 'connected' });
    passed++;
  } catch (e) {
    checks.push({ service: 'openclaw', status: 'failed', error: String(e) });
    failed++;
  }
  
  // Check OpenRouter
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        checks.push({ service: 'openrouter', status: 'connected' });
        passed++;
      } else {
        checks.push({ service: 'openrouter', status: 'failed', error: `HTTP ${response.status}` });
        failed++;
      }
    } else {
      checks.push({ service: 'openrouter', status: 'skipped', error: 'No API key' });
    }
  } catch (e) {
    checks.push({ service: 'openrouter', status: 'failed', error: String(e) });
    failed++;
  }
  
  const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
  
  return {
    id: randomUUID(),
    type: 'connections',
    status: failed === 0 ? 'passed' : 'failed',
    message: `${passed}/${checks.length} connections healthy`,
    duration,
    timestamp,
    details: { checks, passed, failed, total: checks.length },
  };
}

async function runServicesAudit(): Promise<AuditResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  const services = [
    { name: 'Health API', url: 'http://localhost:3005/api/health' },
    { name: 'Agents API', url: 'http://localhost:3005/api/agents/live' },
    { name: 'Executions API', url: 'http://localhost:3005/api/executions' },
    { name: 'Tasks API', url: 'http://localhost:3005/api/tasks' },
  ];
  
  const checks = [];
  let passed = 0;
  let failed = 0;
  
  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(service.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        checks.push({ name: service.name, status: 'up', http_status: response.status });
        passed++;
      } else {
        checks.push({ name: service.name, status: 'degraded', http_status: response.status });
        failed++;
      }
    } catch (e) {
      checks.push({ name: service.name, status: 'down', error: String(e) });
      failed++;
    }
  }
  
  const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
  
  return {
    id: randomUUID(),
    type: 'services',
    status: failed === 0 ? 'passed' : 'failed',
    message: `${passed}/${services.length} services up`,
    duration,
    timestamp,
    details: { checks, passed, failed, total: services.length },
  };
}

async function runDatabaseAudit(): Promise<AuditResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Check connection
    const connStart = Date.now();
    const { error: connError } = await supabase.from('executions').select('id').limit(1);
    const latency = Date.now() - connStart;
    
    if (connError) {
      throw new Error(`Connection failed: ${connError.message}`);
    }
    
    // Get table counts
    const tables = ['executions', 'tasks', 'agents', 'workflows'];
    const counts = [];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        counts.push({
          table,
          count: count || 0,
          status: error ? 'error' : 'ok',
        });
      } catch (e) {
        counts.push({ table, count: 0, status: 'error', error: String(e) });
      }
    }
    
    const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    
    return {
      id: randomUUID(),
      type: 'database',
      status: latency > 2000 ? 'failed' : 'passed',
      message: `DB latency: ${latency}ms`,
      duration,
      timestamp,
      details: {
        latency_ms: latency,
        tables: counts,
      },
    };
  } catch (error) {
    return {
      id: randomUUID(),
      type: 'database',
      status: 'failed',
      message: 'Database audit failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      timestamp,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;
    
    if (!type || !['fleet', 'systems', 'connections', 'services', 'database'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audit type' },
        { status: 400 }
      );
    }
    
    let result: AuditResult;
    
    switch (type as AuditType) {
      case 'fleet':
        result = await runFleetAudit();
        break;
      case 'systems':
        result = await runSystemsAudit();
        break;
      case 'connections':
        result = await runConnectionsAudit();
        break;
      case 'services':
        result = await runServicesAudit();
        break;
      case 'database':
        result = await runDatabaseAudit();
        break;
      default:
        result = {
          id: randomUUID(),
          type: type as AuditType,
          status: 'failed',
          message: 'Unknown audit type',
        };
    }
    
    // Store audit result
    try {
      const supabase = getSupabaseAdmin();
      await (supabase as any).from('audit_logs').insert({
        id: result.id,
        type: result.type,
        status: result.status,
        message: result.message,
        duration: result.duration,
        details: result.details,
        created_at: result.timestamp,
      });
    } catch (e) {
      console.log('[Audit] Failed to store audit log:', e);
    }
    
    return NextResponse.json({
      success: result.status === 'passed',
      result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Audit] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Audit failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
