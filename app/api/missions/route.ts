/**
 * ATLAS-MISSIONS API v1
 * ATLAS-OPTIMUS-MISSION-ENGINE-BACKEND-CLOSEOUT-503
 * 
 * GET/POST /api/missions
 * Full CRUD with Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Valid mission statuses and phases
const VALID_STATUSES = ['draft', 'requested', 'decomposed', 'executing', 'remediating', 'verifying', 'blocked', 'closed', 'cancelled'];
const VALID_PHASES = ['planning', 'execution', 'verification', 'closure'];

// GET /api/missions - List all missions
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] GET /api/missions started`);
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const ownerId = searchParams.get('owner_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('missions')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (phase && phase !== 'all') {
      query = query.eq('phase', phase);
    }
    if (ownerId && ownerId !== 'all') {
      query = query.or(`owner_id.eq.${ownerId},owner_agent.eq.${ownerId}`);
    }
    
    const { data: missions, error, count } = await query;
    
    if (error) {
      console.error(`[${requestId}] Supabase error:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 500 });
    }
    
    // Log diagnostic info
    console.log(`[${requestId}] Supabase returned ${missions?.length || 0} missions, duration: ${Date.now() - startTime}ms`);
    
    // Transform to include computed fields for UI - LIVE DATA ONLY
    const transformedMissions = (missions || []).map(m => ({
      ...m,
      // UI compatibility fields
      percentComplete: m.progress_percent || 0,
      assignedAgents: m.assigned_agents || [m.owner_agent].filter(Boolean),
      currentBlocker: m.current_blocker || null,
      current_blocker: m.current_blocker || null,
      henryAuditVerdict: m.henry_audit_verdict || 'pending',
      henry_audit_verdict: m.henry_audit_verdict || 'pending',
      closure_confidence: m.closure_confidence || 0,
    }));
    
    return NextResponse.json({
      success: true,
      missions: transformedMissions,
      count: transformedMissions.length,
      pagination: { limit, offset, hasMore: transformedMissions.length === limit },
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

// POST /api/missions - Create new mission
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] POST /api/missions started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Build insert object with only defined fields
    const insertData: any = {
      title: body.title,
      status: body.status || 'draft',
      phase: body.phase || 'planning',
    };
    
    if (body.description) insertData.description = body.description;
    if (body.objective) insertData.objective = body.objective;
    if (body.owner_agent) insertData.owner_agent = body.owner_agent;
    if (body.owner_id) insertData.owner_id = body.owner_id;
    if (body.priority) insertData.priority = body.priority;
    if (body.category) insertData.category = body.category;
    if (body.company_id) insertData.company_id = body.company_id;
    if (body.target_start_date) insertData.target_start_date = body.target_start_date;
    if (body.target_end_date) insertData.target_end_date = body.target_end_date;
    if (body.success_criteria) insertData.success_criteria = body.success_criteria;
    if (body.metadata) insertData.metadata = body.metadata;
    if (body.tags) insertData.tags = body.tags;
    
    const { data: mission, error } = await supabase
      .from('missions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error(`[${requestId}] Supabase insert error:`, error);
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
      mission,
      id: mission.id,
      status: 'created',
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    }, { status: 201 });
    
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
