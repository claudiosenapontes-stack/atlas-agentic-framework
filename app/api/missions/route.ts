/**
 * ATLAS-MISSIONS API - COLD-START OPTIMIZED
 * ATLAS-OPTIMUS-RAIL-COLDSTART-REMEDIATION-9201
 * 
 * GET/POST /api/missions
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - DB-call-only retry (3 attempts)
 * - 5s timeout for cold-start tolerance
 * - Lazy Supabase init
 * - BUILD: 9201-COLDSTART-FIX
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestId = () => randomUUID().slice(0, 8);

// GET /api/missions - COLD-START OPTIMIZED
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // LAZY: Init Supabase only when needed
    const supabase = getSupabaseAdmin();
    
    // DB CALL with retry
    const result = await withDbRetry(async () => {
      const { data, error, count } = await supabase
        .from('missions')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return { data: data || [], count };
    }, 'get_missions');
    
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/missions',
      requestId: rid,
      duration,
      recordCount: result.data.length,
      coldStart: duration > 1000,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      missions: result.data,
      count: result.count,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'GET /api/missions',
      requestId: rid,
      duration,
      error: error.message,
      isTimeout,
      success: false
    }));
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - please retry' : error.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}

// POST /api/missions - COLD-START OPTIMIZED
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  const timestamp = new Date().toISOString();
  
  try {
    // Parse body with timeout
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('body parse timeout')), 2000))
    ]) as any;
    
    const { title, description, status = 'draft', priority = 'medium', phase = 'planning' } = body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // LAZY: Init Supabase only after validation
    const supabase = getSupabaseAdmin();
    const missionId = randomUUID();
    
    // DB CALL with retry
    const mission = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('missions')
        .insert({
          id: missionId,
          title: title.trim(),
          description: description || null,
          status,
          priority,
          phase,
          progress_percent: 0,
          child_task_count: 0,
          completed_task_count: 0,
          evidence_bundle: [],
          success_criteria: [],
          metadata: {},
          created_at: timestamp,
          updated_at: timestamp
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, 'create_mission');
    
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions',
      requestId: rid,
      missionId,
      duration,
      coldStart: duration > 1000,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission,
      requestId: rid,
      duration
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions',
      requestId: rid,
      duration,
      error: error.message,
      isTimeout,
      success: false
    }));
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - please retry' : error.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
