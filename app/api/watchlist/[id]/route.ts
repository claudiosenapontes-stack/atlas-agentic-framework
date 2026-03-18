/**
 * ATLAS-WATCHLIST ITEM API
 * ATLAS-OPTIMUS-WATCHLIST-DELETE-API-9860
 * 
 * DELETE /api/watchlist/:id
 * Delete a specific watchlist rule by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required',
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // First, check if the record exists
    const { data: existing, error: checkError } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .select('id, name')
        .eq('id', id)
        .single();
    }, 'check_watch_rule');
    
    if (checkError) {
      const duration = Date.now() - startTime;
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Watchlist item not found',
          id,
          timestamp,
          requestId,
          duration,
        }, { status: 404 });
      }
      return NextResponse.json({
        success: false,
        error: checkError.message,
        code: checkError.code,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    // Delete the record
    const { error: deleteError } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .delete()
        .eq('id', id);
    }, 'delete_watch_rule');
    
    const duration = Date.now() - startTime;
    
    if (deleteError) {
      return NextResponse.json({
        success: false,
        error: deleteError.message,
        code: deleteError.code,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      deleted: id,
      name: existing?.name || null,
      timestamp,
      requestId,
      duration,
    });
    
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

// Also support GET for individual item lookup
export async function GET(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required',
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .select(`
          id,
          name,
          pattern,
          rule_type,
          action_type,
          is_active,
          priority,
          critical_keywords,
          high_keywords,
          medium_keywords,
          exclude_keywords,
          classification_rules,
          reply_scope,
          auto_reply_enabled,
          auto_reply_template,
          follow_up_default_hours,
          follow_up_urgent_hours,
          follow_up_critical_hours,
          auto_summarize,
          notify_agent_ids,
          notify_emails,
          escalation_agent_id,
          company_id,
          email_account,
          folder_pattern,
          watch_schedule,
          auto_execute,
          require_approval,
          max_daily_alerts,
          cooldown_minutes,
          description,
          rule_metadata,
          match_count,
          last_matched_at,
          owner_id,
          created_by,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();
    }, 'get_watch_rule_by_id');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Watchlist item not found',
          id,
          timestamp,
          requestId,
          duration,
        }, { status: 404 });
      }
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
      item: {
        ...data,
        critical_keywords: data.critical_keywords || [],
        high_keywords: data.high_keywords || [],
        medium_keywords: data.medium_keywords || [],
        exclude_keywords: data.exclude_keywords || [],
        notify_agent_ids: data.notify_agent_ids || [],
        notify_emails: data.notify_emails || [],
        classification_rules: data.classification_rules || {},
        watch_schedule: data.watch_schedule || { type: 'realtime' },
        rule_metadata: data.rule_metadata || {},
      },
      timestamp,
      requestId,
      duration,
    });
    
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

// PATCH for updating individual item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required',
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 400 });
    }
    
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    // Remove id from body if present (use path param)
    const { id: _, ...updates } = body;
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .update({
          ...updates,
          updated_at: timestamp,
        })
        .eq('id', id)
        .select()
        .single();
    }, 'update_watch_rule_by_id');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Watchlist item not found',
          id,
          timestamp,
          requestId,
          duration,
        }, { status: 404 });
      }
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
      item: data,
      timestamp,
      requestId,
      duration,
    });
    
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
