/**
 * ATLAS-OPTIMUS-DB-POOL-FIX-9401
 * Decompose with connection pooling and retry logic
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MARKER = '9401-POOL-FIX';
const DB_TIMEOUT_MS = 3000;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rid = randomUUID().slice(0, 8);
  const start = Date.now();
  const errorSource = 'db_connection';
  
  try {
    const body = await Promise.race([
      req.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('body parse timeout')), 2000))
    ]) as any;
    
    const tasks = body.tasks || [];
    
    if (!tasks.length) {
      return NextResponse.json({ 
        success: false, error: 'tasks required', marker: MARKER, rid, 
        duration: Date.now() - start 
      }, { status: 400 });
    }
    
    // MAX 3 parallel tasks to prevent pool exhaustion
    if (tasks.length > 10) {
      return NextResponse.json({
        success: false, error: 'max 10 tasks per decompose', marker: MARKER, rid,
        duration: Date.now() - start
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const missionId = params.id;
    const ts = new Date().toISOString();
    
    // Get mission with retry
    const mission = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,phase,priority,company_id')
        .eq('id', missionId)
        .single();
      if (error) throw error;
      return data;
    }, 'get_mission');
    
    if (!mission) {
      return NextResponse.json({ 
        success: false, error: 'mission not found', marker: MARKER, rid,
        duration: Date.now() - start
      }, { status: 404 });
    }
    
    // Batch agent lookup - single query for all agents
    const agentNames = tasks.map((t: any) => 
      (t.assigned_agent_id || t.owner_agent || '').toLowerCase().trim()
    ).filter(Boolean);
    
    const uniqueAgents = Array.from(new Set(agentNames));
    
    // Fetch all agents in one query
    const agentMap = new Map();
    if (uniqueAgents.length > 0) {
      await withDbRetry(async () => {
        const { data: agents, error } = await supabase
          .from('agents')
          .select('id,name')
          .in('name', uniqueAgents);
        
        if (error) throw error;
        
        agents?.forEach((a: any) => {
          agentMap.set(a.name.toLowerCase(), a.id);
        });
      }, 'batch_agent_lookup');
    }
    
    // Build payloads
    const payloads = [];
    for (const t of tasks) {
      const agentName = (t.assigned_agent_id || t.owner_agent || '').toLowerCase().trim();
      if (!agentName) {
        return NextResponse.json({ 
          success: false, error: 'agent required for task: ' + (t.title || 'unnamed'), 
          marker: MARKER, rid,
          duration: Date.now() - start
        }, { status: 400 });
      }
      
      const ownerId = agentMap.get(agentName) || agentName;
      
      payloads.push({
        id: randomUUID(),
        title: t.title || 'Untitled',
        description: t.description || null,
        task_type: (t.task_type || 'implementation').toLowerCase(),
        status: 'pending',
        priority: (t.priority || mission.priority || 'medium').toLowerCase(),
        assigned_agent_id: agentName,
        owner_id: ownerId,
        mission_id: missionId,
        company_id: mission.company_id,
        metadata: { source: MARKER, decomposed_at: ts },
        created_at: ts,
        updated_at: ts
      });
    }
    
    // Insert with retry - sequential to avoid pool exhaustion
    const created = [];
    for (const payload of payloads) {
      const task = await withDbRetry(async () => {
        const { data, error } = await supabase
          .from('tasks')
          .insert(payload)
          .select('id,title,assigned_agent_id,owner_id,mission_id')
          .single();
        
        if (error) throw error;
        return data;
      }, 'insert_task');
      
      created.push(task);
    }
    
    const duration = Date.now() - start;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
      duration,
      taskCount: created.length,
      agentLookups: uniqueAgents.length,
      marker: MARKER,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      tasks: created,
      marker: MARKER,
      rid,
      duration,
      errorSource: null
    });
    
  } catch (e: any) {
    const duration = Date.now() - start;
    const isTimeout = e.message?.includes('timeout');
    
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
      duration,
      error: e.message,
      errorSource: isTimeout ? 'db_timeout' : errorSource,
      marker: MARKER,
      success: false
    }));
    
    return NextResponse.json({ 
      success: false, 
      error: isTimeout ? 'Database timeout - retry requested' : e.message, 
      marker: MARKER, 
      rid, 
      duration,
      errorSource: isTimeout ? 'db_timeout' : errorSource,
      retryable: isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
