/**
 * ATLAS-MISSION API v1 - Single Mission Operations
 * ATLAS-OPTIMUS-MISSION-ENGINE-BACKEND-203
 * 
 * GET/PUT/DELETE /api/missions/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid mission statuses and phases
const VALID_STATUSES = ['draft', 'active', 'in_progress', 'completed', 'closed', 'cancelled'];
const VALID_PHASES = ['planning', 'execution', 'verification', 'closure'];

// GET /api/missions/:id - Get single mission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id } = params;
  
  console.log(`[${requestId}] GET /api/missions/${id} started`);
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('include_tasks') === 'true';
    const includeHistory = searchParams.get('include_history') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    // Build select string based on includes
    let selectStr = '*';
    if (includeTasks) {
      selectStr += ', mission_tasks(*, tasks(*))';
    }
    
    const { data: mission, error } = await (supabase as any)
      .from('missions')
      .select(selectStr)
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) {
      console.error(`[${requestId}] SELECT ERROR:`, error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Mission not found',
          timestamp,
          requestId,
        }, { status: 404 });
      }
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    // Fetch history if requested
    let history = null;
    if (includeHistory) {
      const { data: historyData } = await (supabase as any)
        .from('mission_status_history')
        .select('*')
        .eq('mission_id', id)
        .order('created_at', { ascending: false });
      history = historyData || [];
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Mission retrieved in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission,
      history,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] GET exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
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
  const { id } = params;
  
  console.log(`[${requestId}] PUT /api/missions/${id} started`);
  const startTime = Date.now();
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const {
      title,
      description,
      objective,
      status,
      phase,
      priority,
      category,
      target_start_date,
      target_end_date,
      actual_start_date,
      actual_end_date,
      success_criteria,
      evidence_bundle,
      metadata,
      tags,
      progress_percent,
      changed_by,
      changed_by_agent,
    } = body;
    
    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    // Validate phase if provided
    if (phase && !VALID_PHASES.includes(phase)) {
      return NextResponse.json({
        success: false,
        error: `phase must be one of: ${VALID_PHASES.join(', ')}`,
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Build update payload
    const updatePayload: any = {
      updated_at: timestamp,
    };
    
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (objective !== undefined) updatePayload.objective = objective;
    if (status !== undefined) updatePayload.status = status;
    if (phase !== undefined) updatePayload.phase = phase;
    if (priority !== undefined) updatePayload.priority = priority;
    if (category !== undefined) updatePayload.category = category;
    if (target_start_date !== undefined) updatePayload.target_start_date = target_start_date;
    if (target_end_date !== undefined) updatePayload.target_end_date = target_end_date;
    if (actual_start_date !== undefined) updatePayload.actual_start_date = actual_start_date;
    if (actual_end_date !== undefined) updatePayload.actual_end_date = actual_end_date;
    if (success_criteria !== undefined) updatePayload.success_criteria = success_criteria;
    if (evidence_bundle !== undefined) updatePayload.evidence_bundle = evidence_bundle;
    if (tags !== undefined) updatePayload.tags = tags;
    if (progress_percent !== undefined) updatePayload.progress_percent = progress_percent;
    
    // Add change tracking to metadata
    if (changed_by || changed_by_agent) {
      updatePayload.metadata = {
        ...(metadata || {}),
        changed_by,
        changed_by_agent,
        changed_at: timestamp,
      };
    } else if (metadata) {
      updatePayload.metadata = metadata;
    }
    
    console.log(`[${requestId}] Updating mission:`, { id, updates: Object.keys(updatePayload) });
    
    const { data, error } = await (supabase as any)
      .from('missions')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) {
      console.error(`[${requestId}] UPDATE ERROR:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        timestamp,
        requestId,
      }, { status: 404 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Mission updated in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission: data,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] PUT exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
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
  const { id } = params;
  
  console.log(`[${requestId}] DELETE /api/missions/${id} started`);
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('missions')
      .update({ deleted_at: timestamp, updated_at: timestamp })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) {
      console.error(`[${requestId}] DELETE ERROR:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        timestamp,
        requestId,
      }, { status: 404 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Mission soft-deleted in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Mission deleted',
      id,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] DELETE exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
    }, { status: 500 });
  }
}
