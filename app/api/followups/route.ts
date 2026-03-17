/**
 * ATLAS-FOLLOWUPS API
 * ATLAS-OPTIMUS-EXEC-ENDPOINTS-FIX-9819
 * 
 * GET/POST /api/followups
 * Fixed to use decision_queue table (followups table doesn't exist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Query decision_queue for follow-up items
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('decision_queue')
        .select('*')
        .in('item_type', ['task_escalation', 'approval'])
        .order('created_at', { ascending: false })
        .limit(50);
    }, 'get_followups');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        success: false,
        followups: [],
        count: 0,
        error: error.message,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    const followups = data || [];
    const overdue = followups.filter((f: any) => {
      if (f.status !== 'open') return false;
      if (!f.due_at) return false;
      return new Date(f.due_at) < new Date();
    }).length;
    
    return NextResponse.json({
      success: true,
      followups,
      count: followups.length,
      stats: {
        total: followups.length,
        by_status: followups.reduce((acc: any, f: any) => {
          acc[f.status] = (acc[f.status] || 0) + 1;
          return acc;
        }, {}),
        overdue,
      },
      timestamp,
      requestId,
      duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      followups: [],
      count: 0,
      error: error.message,
      timestamp,
      requestId,
      duration,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      due_date, 
      priority = 'normal', 
      assigned_to,
      owner_id 
    } = body;
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Build payload for decision_queue table
    const insertPayload: any = {
      id,
      title,
      item_type: 'task_escalation',
      source_id: id,
      source_table: 'tasks',
      status: 'open',
      priority,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    if (description) insertPayload.description = description;
    if (due_date) insertPayload.due_at = due_date;
    if (assigned_to) insertPayload.assigned_to = assigned_to;
    if (owner_id) insertPayload.owner_id = owner_id;
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('decision_queue')
        .insert(insertPayload)
        .select()
        .single();
    }, 'insert_followup');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      followup: data,
      id,
      timestamp,
      requestId,
      duration,
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
      duration,
    }, { status: 500 });
  }
}
