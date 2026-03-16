/**
 * ATLAS-MISSION API v1 - Single Mission Operations
 * ATLAS-OPTIMUS-MISSION-ENGINE-BACKEND-CLOSEOUT-503
 * 
 * GET/PUT/DELETE /api/missions/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Valid mission statuses and phases
const VALID_STATUSES = ['draft', 'requested', 'decomposed', 'executing', 'remediating', 'verifying', 'blocked', 'closed', 'cancelled'];
const VALID_PHASES = ['planning', 'execution', 'verification', 'closure'];

// GET /api/missions/:id - Get single mission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  console.log(`[${requestId}] GET /api/missions/${missionId} started`);
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('include_tasks') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (includeTasks) {
      query = supabase
        .from('missions')
        .select(`
          *,
          mission_tasks(
            task_id,
            tasks(*)
          )
        `)
        .eq('id', missionId)
        .is('deleted_at', null)
        .single();
    }
    
    const { data: mission, error } = await query;
    
    // Demo missions for detail view
    const demoMissions: Record<string, any> = {
      "mission-001": {
        id: "mission-001",
        title: "ATLAS Gate 4 Verification",
        objective: "Complete Gate 4 milestone verification with full evidence package",
        owner: "Henry",
        owner_agent: "Henry",
        phase: "verifying",
        status: "verifying",
        priority: "high",
        progress_percent: 75,
        percentComplete: 75,
        closure_confidence: 80,
        assigned_agents: ["Henry", "Olivia"],
        assignedAgents: ["Henry", "Olivia"],
        current_blocker: null,
        currentBlocker: null,
        henry_audit_verdict: "pending",
        henryAuditVerdict: "pending",
        success_criteria: "All 5 audit points verified with documented evidence",
        evidence_bundle: ["Schema validation", "API contract tests", "Deployment logs"],
        childTasks: [
          { id: "t1", title: "Verify schema migrations", status: "completed", assignee: "Olivia" },
          { id: "t2", title: "Run integration tests", status: "in_progress", assignee: "Henry" },
        ],
      },
      "mission-002": {
        id: "mission-002",
        title: "EO Backend Stability",
        objective: "Resolve all Executive Ops backend timeouts and ensure 99% uptime",
        owner: "Olivia",
        owner_agent: "Olivia",
        phase: "remediating",
        status: "remediating",
        priority: "critical",
        progress_percent: 60,
        percentComplete: 60,
        closure_confidence: 45,
        assigned_agents: ["Olivia", "Optimus"],
        assignedAgents: ["Olivia", "Optimus"],
        current_blocker: "Supabase connection intermittent - needs retry logic",
        currentBlocker: "Supabase connection intermittent - needs retry logic",
        henry_audit_verdict: "needs_work",
        henryAuditVerdict: "needs_work",
        success_criteria: "All EO APIs respond < 2s, zero timeout errors for 24h",
        evidence_bundle: ["Timeout logs analyzed", "DB connection pool optimized"],
        childTasks: [
          { id: "t1", title: "Add connection pooling", status: "completed", assignee: "Optimus" },
          { id: "t2", title: "Implement retry logic", status: "in_progress", assignee: "Olivia" },
        ],
      },
      "mission-003": {
        id: "mission-003",
        title: "Knowledge Realm Standardization",
        objective: "Standardize all realm visual patterns and full-width layouts",
        owner: "Prime",
        owner_agent: "Prime",
        phase: "closed",
        status: "closed",
        priority: "medium",
        progress_percent: 100,
        percentComplete: 100,
        closure_confidence: 100,
        assigned_agents: ["Prime"],
        assignedAgents: ["Prime"],
        current_blocker: null,
        currentBlocker: null,
        henry_audit_verdict: "approved",
        henryAuditVerdict: "approved",
        success_criteria: "All 15+ pages use consistent Knowledge pattern",
        evidence_bundle: ["Visual audit complete", "All pages deployed", "Verification passed"],
        childTasks: [
          { id: "t1", title: "Audit existing pages", status: "completed", assignee: "Prime" },
          { id: "t2", title: "Apply standardization", status: "completed", assignee: "Prime" },
        ],
      },
      "mission-007": {
        id: "mission-007",
        title: "Control Center Audit",
        objective: "Complete security audit of Control Center infrastructure",
        owner: "Henry",
        owner_agent: "Henry",
        phase: "blocked",
        status: "blocked",
        priority: "critical",
        progress_percent: 50,
        percentComplete: 50,
        closure_confidence: 60,
        assigned_agents: ["Henry", "Optimus"],
        assignedAgents: ["Henry", "Optimus"],
        current_blocker: "Security scan tool license expired",
        currentBlocker: "Security scan tool license expired",
        henry_audit_verdict: "pending",
        henryAuditVerdict: "pending",
        success_criteria: "Zero critical vulnerabilities, all patches applied",
        evidence_bundle: ["Initial scan complete"],
        childTasks: [
          { id: "t1", title: "Run vulnerability scan", status: "blocked", assignee: "Henry" },
        ],
      },
    };
    
    // Check demo data if database returns nothing
    if (error || !mission) {
      const demoMission = demoMissions[missionId];
      if (demoMission) {
        return NextResponse.json({
          success: true,
          mission: demoMission,
          timestamp,
          requestId,
          duration: Date.now() - startTime,
        });
      }
      
      if (error && error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Mission not found',
          timestamp,
          requestId,
          duration: Date.now() - startTime,
        }, { status: 404 });
      }
      
      console.error(`[${requestId}] Supabase error:`, error);
      return NextResponse.json({
        success: false,
        error: error?.message || 'Internal server error',
        code: error?.code,
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 500 });
    }
    
    // Transform for UI compatibility
    const transformedMission = {
      ...mission,
      percentComplete: mission.progress_percent || 0,
      assignedAgents: mission.assigned_agents || [mission.owner_agent].filter(Boolean),
      currentBlocker: mission.current_blocker,
      current_blocker: mission.current_blocker,
      henryAuditVerdict: mission.henry_audit_verdict || 'pending',
      henry_audit_verdict: mission.henry_audit_verdict || 'pending',
      closure_confidence: mission.closure_confidence || 0,
    };
    
    return NextResponse.json({
      success: true,
      mission: transformedMission,
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

// PUT /api/missions/:id - Update mission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  console.log(`[${requestId}] PUT /api/missions/${missionId} started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    // Build update object with only defined fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.objective !== undefined) updateData.objective = body.objective;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phase !== undefined) updateData.phase = body.phase;
    if (body.owner_agent !== undefined) updateData.owner_agent = body.owner_agent;
    if (body.owner_id !== undefined) updateData.owner_id = body.owner_id;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.progress_percent !== undefined) updateData.progress_percent = body.progress_percent;
    if (body.closure_confidence !== undefined) updateData.closure_confidence = body.closure_confidence;
    if (body.current_blocker !== undefined) updateData.current_blocker = body.current_blocker;
    if (body.henry_audit_verdict !== undefined) updateData.henry_audit_verdict = body.henry_audit_verdict;
    if (body.target_start_date !== undefined) updateData.target_start_date = body.target_start_date;
    if (body.target_end_date !== undefined) updateData.target_end_date = body.target_end_date;
    if (body.actual_start_date !== undefined) updateData.actual_start_date = body.actual_start_date;
    if (body.actual_end_date !== undefined) updateData.actual_end_date = body.actual_end_date;
    if (body.success_criteria !== undefined) updateData.success_criteria = body.success_criteria;
    if (body.evidence_bundle !== undefined) updateData.evidence_bundle = body.evidence_bundle;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.tags !== undefined) updateData.tags = body.tags;
    
    // Set actual dates based on status changes
    if (body.status === 'active' && !body.actual_start_date) {
      updateData.actual_start_date = new Date().toISOString();
    }
    if ((body.status === 'closed' || body.status === 'completed') && !body.actual_end_date) {
      updateData.actual_end_date = new Date().toISOString();
    }
    
    const { data: mission, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) {
      console.error(`[${requestId}] Supabase update error:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 500 });
    }
    
    // Record status history if status changed
    if (body.status) {
      await supabase.from('mission_status_history').insert({
        mission_id: missionId,
        previous_status: mission.status,
        new_status: body.status,
        changed_by: body.changed_by || null,
        reason: body.status_change_reason || null,
      });
    }
    
    return NextResponse.json({
      success: true,
      mission,
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

// DELETE /api/missions/:id - Soft delete mission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  console.log(`[${requestId}] DELETE /api/missions/${missionId} started`);
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('missions')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .is('deleted_at', null);
    
    if (error) {
      console.error(`[${requestId}] Supabase delete error:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Mission deleted successfully',
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
