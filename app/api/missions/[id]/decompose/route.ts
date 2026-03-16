/**
 * POST /api/missions/:id/decompose
 * Decompose a mission into child tasks
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id: missionId } = params;
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/decompose started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { tasks, created_by, created_by_agent } = body;
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array is required',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Verify mission exists
    const { data: mission, error: missionError } = await (supabase as any)
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (missionError || !mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        timestamp,
        requestId,
      }, { status: 404 });
    }
    
    // Create tasks and link to mission
    const createdTasks = [];
    const taskLinks = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const taskDef = tasks[i];
      const taskId = randomUUID();
      
      // Create the task
      const taskPayload = {
        id: taskId,
        title: taskDef.title,
        description: taskDef.description || null,
        status: taskDef.status || 'pending',
        priority: taskDef.priority || mission.priority || 'medium',
        assignee_id: taskDef.assignee_id || null,
        assignee_agent: taskDef.assignee_agent || null,
        company_id: mission.company_id,
        parent_id: null,
        due_date: taskDef.due_date || null,
        task_type: taskDef.task_type || 'implementation',
        metadata: {
          mission_id: missionId,
          created_from_decompose: true,
          ...taskDef.metadata,
        },
        created_at: timestamp,
        updated_at: timestamp,
      };
      
      const { data: task, error: taskError } = await (supabase as any)
        .from('tasks')
        .insert(taskPayload)
        .select()
        .single();
      
      if (taskError) {
        console.error(`[${requestId}] Task creation error:`, taskError);
        continue;
      }
      
      createdTasks.push(task);
      
      // Link task to mission
      const linkPayload = {
        mission_id: missionId,
        task_id: taskId,
        task_role: taskDef.role || 'subtask',
        sequence_order: taskDef.sequence_order || i,
        is_blocking: taskDef.is_blocking || false,
      };
      
      const { data: link, error: linkError } = await (supabase as any)
        .from('mission_tasks')
        .insert(linkPayload)
        .select()
        .single();
      
      if (!linkError) {
        taskLinks.push(link);
      }
    }
    
    // Update mission phase to execution if in planning
    if (mission.phase === 'planning') {
      await (supabase as any)
        .from('missions')
        .update({ 
          phase: 'execution', 
          status: 'active',
          actual_start_date: timestamp,
          updated_at: timestamp,
          metadata: {
            ...mission.metadata,
            changed_by: created_by,
            changed_by_agent: created_by_agent,
          }
        })
        .eq('id', missionId);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Decomposed mission into ${createdTasks.length} tasks in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission_id: missionId,
      tasks_created: createdTasks.length,
      tasks: createdTasks,
      links: taskLinks,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] POST exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
    }, { status: 500 });
  }
}
