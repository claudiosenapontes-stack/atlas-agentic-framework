/**
 * POST /api/missions/:id/decompose - ATLAS-9002
 * ATLAS-OPTIMUS-TASK-MISSION-INTEGRITY-9002
 * FORCE NODEJS RUNTIME - BUILD 2026-03-17-0050
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  const rid = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  try {
    const body = await request.json();
    const { tasks: taskDefs } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // Get mission
    const { data: mission } = await supabase
      .from('missions')
      .select('id,phase,priority,company_id')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (!mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    // Build payloads with guaranteed non-null assigned_agent_id
    const payloads = [];
    for (const def of taskDefs) {
      const agentId = (def.assigned_agent_id || def.owner_agent || 'unassigned').toLowerCase().trim();
      payloads.push({
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled',
        description: def.description || null,
        status: def.status || 'pending',
        priority: def.priority || mission.priority || 'medium',
        company_id: mission.company_id,
        task_type: def.task_type || 'implementation',
        assigned_agent_id: agentId,  // NEVER NULL
        owner_id: agentId,           // NEVER NULL
        metadata: { mission_id: missionId, source: 'decompose' },
        created_at: timestamp,
        updated_at: timestamp
      });
    }
    
    // Insert tasks
    const { data: created, error: insertErr } = await supabase
      .from('tasks')
      .insert(payloads)
      .select('id,title,status,assigned_agent_id,owner_id');
    
    if (insertErr) {
      return NextResponse.json({
        success: false,
        error: insertErr.message,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // Create mission_task links
    const links = created.map((t: any, i: number) => ({
      mission_id: missionId,
      task_id: t.id,
      task_role: taskDefs[i]?.role || 'subtask',
      sequence_order: i,
      is_blocking: taskDefs[i]?.is_blocking || false
    }));
    
    await supabase.from('mission_tasks').insert(links);
    
    // Update mission
    await supabase.from('missions').update({
      phase: 'execution',
      status: 'active',
      updated_at: timestamp
    }).eq('id', missionId);
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      mission: { id: missionId, phase: 'execution', status: 'active', child_task_count: created.length },
      tasks: created,
      requestId: rid,
      duration
    });
    
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal error',
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
