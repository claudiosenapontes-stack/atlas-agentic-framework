/**
 * ATLAS-9930 Phase 2: /api/agents/performance
 * Returns historical performance metrics for agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AgentMetrics {
  agentId: string;
  displayName: string;
  tasksCompleted: {
    last24h: number;
    last7d: number;
    last30d: number;
    total: number;
  };
  successRate: number; // percentage
  avgExecutionTime: number; // seconds
  errorRate: number; // percentage
  trend: 'up' | 'down' | 'stable';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Calculate time boundaries
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get all executions
    const { data: executions, error } = await supabase
      .from('executions')
      .select('agent_id, status, created_at, completed_at, duration_seconds')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Define known agents
    const knownAgents = [
      { id: 'henry', name: 'Henry' },
      { id: 'optimus', name: 'Optimus' },
      { id: 'optimus-prime', name: 'Optimus Prime' },
      { id: 'prime', name: 'Prime' },
      { id: 'olivia', name: 'Olivia' },
      { id: 'sophia', name: 'Sophia' },
      { id: 'harvey', name: 'Harvey' },
      { id: 'einstein', name: 'Einstein' },
      { id: 'severino', name: 'Severino' }
    ];
    
    // Calculate metrics for each agent
    const metrics: AgentMetrics[] = knownAgents.map(agent => {
      const agentExecutions = executions?.filter(e => e.agent_id === agent.id) || [];
      
      const last24hExecs = agentExecutions.filter(e => e.created_at >= last24h);
      const last7dExecs = agentExecutions.filter(e => e.created_at >= last7d);
      const last30dExecs = agentExecutions.filter(e => e.created_at >= last30d);
      
      const completed = agentExecutions.filter(e => e.status === 'completed');
      const failed = agentExecutions.filter(e => e.status === 'failed');
      
      const totalCompleted = completed.length;
      const totalFailed = failed.length;
      const total = totalCompleted + totalFailed;
      
      // Success rate
      const successRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;
      
      // Error rate
      const errorRate = total > 0 ? Math.round((totalFailed / total) * 100) : 0;
      
      // Average execution time
      const execsWithDuration = agentExecutions.filter(e => e.duration_seconds);
      const avgExecutionTime = execsWithDuration.length > 0
        ? Math.round(execsWithDuration.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / execsWithDuration.length)
        : 0;
      
      // Determine trend (compare last 7d to previous 7d)
      const prev7dStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const prev7dExecs = agentExecutions.filter(e => 
        e.created_at >= prev7dStart && e.created_at < last7d
      );
      
      let trend: AgentMetrics['trend'] = 'stable';
      if (last7dExecs.length > prev7dExecs.length * 1.2) trend = 'up';
      else if (last7dExecs.length < prev7dExecs.length * 0.8) trend = 'down';
      
      return {
        agentId: agent.id,
        displayName: agent.name,
        tasksCompleted: {
          last24h: last24hExecs.filter(e => e.status === 'completed').length,
          last7d: last7dExecs.filter(e => e.status === 'completed').length,
          last30d: last30dExecs.filter(e => e.status === 'completed').length,
          total: totalCompleted
        },
        successRate,
        avgExecutionTime,
        errorRate,
        trend
      };
    });
    
    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    console.error('Error fetching agent performance:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
