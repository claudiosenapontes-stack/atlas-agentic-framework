/**
 * ATLAS-FOLLOWUPS API
 * ATLAS-PRIME-OLIVIA-WRITE-SYNC-9816
 * 
 * GET/POST /api/followups
 * Full implementation with database writes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('followups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('[Followups] Query error:', error);
      return NextResponse.json({
        success: false,
        followups: [],
        count: 0,
        error: error.message,
        timestamp,
      }, { status: 500 });
    }
    
    const followups = data || [];
    const overdue = followups.filter((f: any) => {
      if (f.status !== 'pending') return false;
      if (!f.due_date) return false;
      return new Date(f.due_date) < new Date();
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
    });
  } catch (error: any) {
    console.error('[Followups] Error:', error);
    return NextResponse.json({
      success: false,
      followups: [],
      count: 0,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { title, description, due_date, priority = 'medium', assignee } = body;
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        timestamp,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    const insertPayload: any = {
      id,
      title,
      status: 'pending',
      priority,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    if (description) insertPayload.description = description;
    if (due_date) insertPayload.due_date = due_date;
    if (assignee) insertPayload.assignee = assignee;
    
    const { data, error } = await (supabase as any)
      .from('followups')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) {
      console.error('[Followups] Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      followup: data,
      id,
      timestamp,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Followups] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}
