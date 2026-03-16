/**
 * ATLAS-MISSIONS API v1
 * ATLAS-OPTIMUS-MISSION-ENGINE-BACKEND-203
 * 
 * GET/POST /api/missions
 * Mission Engine backend for Henry
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid mission statuses
const VALID_STATUSES = ['draft', 'active', 'in_progress', 'completed', 'closed', 'cancelled'];
const VALID_PHASES = ['planning', 'execution', 'verification', 'closure'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// GET /api/missions - List missions
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] GET /api/missions started`);
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const ownerId = searchParams.get('owner_id');
    const companyId = searchParams.get('company_id');
    const priority = searchParams.get('priority');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeTasks = searchParams.get('include_tasks') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    // Build query
    let query = (supabase as any)
      .from('missions')
      .select(includeTasks ? '*, mission_tasks(*, tasks(*))' : '*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }
    if (phase && VALID_PHASES.includes(phase)) {
      query = query.eq('phase', phase);
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query = query.eq('priority', priority);
    }
    
    const { data, error, count } = await query;
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] SELECT completed in ${duration}ms`, { count: data?.length });
    
    if (error) {
      console.error(`[${requestId}] SELECT ERROR:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      missions: data || [],
      count: data?.length || 0,
      pagination: {
        limit,
        offset,
        hasMore: (data?.length || 0) === limit,
      },
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

// POST /api/missions - Create a new mission
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] POST /api/missions started`);
  const startTime = Date.now();
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body:`, JSON.stringify(body));
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
      owner_id,
      owner_agent,
      company_id,
      priority = 'medium',
      category,
      target_start_date,
      target_end_date,
      success_criteria,
      tags,
      metadata
    } = body;
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({
        success: false,
        error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Build insert payload
    const id = randomUUID();
    const insertPayload: any = {
      id,
      title,
      description: description || null,
      objective: objective || null,
      status: 'draft',
      phase: 'planning',
      owner_id: owner_id || null,
      owner_agent: owner_agent || null,
      company_id: company_id || null,
      priority,
      category: category || null,
      target_start_date: target_start_date || null,
      target_end_date: target_end_date || null,
      success_criteria: success_criteria || [],
      tags: tags || [],
      metadata: metadata || {},
      evidence_bundle: {},
      progress_percent: 0,
      child_task_count: 0,
      completed_task_count: 0,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    console.log(`[${requestId}] Inserting mission:`, { id, title });
    
    const insertStart = Date.now();
    const { data, error } = await (supabase as any)
      .from('missions')
      .insert(insertPayload)
      .select()
      .single();
    
    const insertDuration = Date.now() - insertStart;
    const totalDuration = Date.now() - startTime;
    
    if (error) {
      console.error(`[${requestId}] INSERT ERROR:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration: insertDuration,
      }, { status: 500 });
    }
    
    console.log(`[${requestId}] Mission created successfully:`, { id, duration: insertDuration });
    
    return NextResponse.json({
      success: true,
      mission: data,
      id,
      status: 'created',
      timestamp,
      requestId,
      duration: totalDuration,
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] POST exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
      duration,
    }, { status: 500 });
  }
}
