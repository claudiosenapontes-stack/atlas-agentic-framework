/**
 * ATLAS-INCIDENTS API
 * Real-time incident data from runtime
 * 
 * GET /api/control/incidents
 * Returns: Active and resolved incidents from runtime events
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

interface Incident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  message: string;
  service: string;
  createdAt: string;
  resolvedAt?: string;
  assignee?: string;
  source: 'runtime' | 'system' | 'agent';
}

async function getRuntimeIncidents(): Promise<Incident[]> {
  const supabase = getSupabaseAdmin();
  const incidents: Incident[] = [];
  
  try {
    // 1. Check for stuck executions (>30 min pending/running)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckExecs, error: stuckError } = await (supabase as any)
      .from('executions')
      .select('id, task_id, agent_id, started_at, status, error_message')
      .or('status.eq.pending,status.eq.running')
      .lt('started_at', thirtyMinAgo)
      .order('started_at', { ascending: true })
      .limit(10);
    
    if (!stuckError && stuckExecs && stuckExecs.length > 0) {
      incidents.push({
        id: `INC-STUCK-${Date.now()}`,
        type: 'stuck_execution',
        severity: stuckExecs.length > 5 ? 'critical' : stuckExecs.length > 2 ? 'high' : 'medium',
        status: 'open',
        message: `${stuckExecs.length} execution${stuckExecs.length > 1 ? 's' : ''} stuck >30min`,
        service: 'task-orchestrator',
        createdAt: stuckExecs[0].started_at,
        source: 'runtime',
      });
    }
    
    // 2. Check for failed executions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: failedExecs, error: failedError } = await (supabase as any)
      .from('executions')
      .select('id, task_id, agent_id, completed_at, error_message, failure_class')
      .eq('status', 'failed')
      .gte('completed_at', oneHourAgo)
      .limit(20);
    
    if (!failedError && failedExecs && failedExecs.length > 0) {
      const criticalFailures = failedExecs.filter(e => 
        e.failure_class === 'crash' || e.failure_class === 'permanent'
      );
      
      if (criticalFailures.length > 0) {
        incidents.push({
          id: `INC-FAIL-${Date.now()}`,
          type: 'execution_failures',
          severity: criticalFailures.length > 5 ? 'critical' : criticalFailures.length > 2 ? 'high' : 'medium',
          status: 'open',
          message: `${failedExecs.length} execution failures in last hour`,
          service: 'execution-engine',
          createdAt: oneHourAgo,
          source: 'runtime',
        });
      }
    }
    
    // 3. Check for dead_letter executions
    const { data: deadLetters, error: dlError } = await (supabase as any)
      .from('executions')
      .select('id, task_id, agent_id, updated_at, retry_count')
      .eq('status', 'dead_letter')
      .gte('updated_at', oneHourAgo)
      .limit(10);
    
    if (!dlError && deadLetters && deadLetters.length > 0) {
      incidents.push({
        id: `INC-DL-${Date.now()}`,
        type: 'dead_letter_queue',
        severity: deadLetters.length > 3 ? 'critical' : 'high',
        status: 'open',
        message: `${deadLetters.length} execution${deadLetters.length > 1 ? 's' : ''} moved to dead letter`,
        service: 'retry-engine',
        createdAt: (deadLetters[0] as any).updated_at || new Date().toISOString(),
        source: 'runtime',
      });
    }
    
    // 4. Check for queue backlog (pending executions)
    const { count: pendingCount, error: pendingError } = await (supabase as any)
      .from('executions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (!pendingError && pendingCount && pendingCount > 20) {
      incidents.push({
        id: `INC-QUEUE-${Date.now()}`,
        type: 'queue_backlog',
        severity: pendingCount > 100 ? 'critical' : pendingCount > 50 ? 'high' : 'medium',
        status: 'open',
        message: `Queue backlog: ${pendingCount} pending executions`,
        service: 'execution-queue',
        createdAt: new Date().toISOString(),
        source: 'system',
      });
    }
    
    // 5. Check for database latency issues
    const startCheck = Date.now();
    const { error: dbError } = await supabase.from('executions').select('id').limit(1);
    const dbLatency = Date.now() - startCheck;
    
    if (dbError) {
      incidents.push({
        id: `INC-DB-${Date.now()}`,
        type: 'database_error',
        severity: 'critical',
        status: 'open',
        message: `Database connection error: ${dbError.message}`,
        service: 'supabase',
        createdAt: new Date().toISOString(),
        source: 'system',
      });
    } else if (dbLatency > 2000) {
      incidents.push({
        id: `INC-DBLAT-${Date.now()}`,
        type: 'database_latency',
        severity: dbLatency > 5000 ? 'critical' : 'high',
        status: 'open',
        message: `Database latency high: ${dbLatency}ms`,
        service: 'supabase',
        createdAt: new Date().toISOString(),
        source: 'system',
      });
    }
    
    return incidents;
  } catch (error) {
    console.error('[Incidents] Error fetching runtime incidents:', error);
    return [{
      id: `INC-ERR-${Date.now()}`,
      type: 'incident_system_error',
      severity: 'high',
      status: 'open',
      message: 'Failed to fetch runtime incidents',
      service: 'incident-api',
      createdAt: new Date().toISOString(),
      source: 'system',
    }];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all'; // all, open, resolved
  
  try {
    const incidents = await getRuntimeIncidents();
    
    // Filter incidents
    let filtered = incidents;
    if (filter === 'open') {
      filtered = incidents.filter(i => i.status !== 'resolved');
    } else if (filter === 'resolved') {
      filtered = incidents.filter(i => i.status === 'resolved');
    }
    
    const stats = {
      open: incidents.filter(i => i.status !== 'resolved').length,
      critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
    };
    
    return NextResponse.json({
      success: true,
      incidents: filtered,
      stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Incidents] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get incidents',
        incidents: [],
        stats: { open: 0, critical: 0, resolved: 0 },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
