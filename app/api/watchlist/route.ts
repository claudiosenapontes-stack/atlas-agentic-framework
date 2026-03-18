/**
 * ATLAS-WATCHLIST API
 * ATLAS-OPTIMUS-WATCHLIST-REAL-PERSISTENCE-9848
 * 
 * GET/POST /api/watchlist
 * Full metadata persistence in database - no memory/runtime split
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Query watch_rules with ALL metadata columns
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
        .order('created_at', { ascending: false })
        .limit(100);
    }, 'get_watch_rules');
    
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
    
    // Return ALL rules with FULL config - no filtering, no hidden logic
    const items = (data || []).map((item: any) => ({
      ...item,
      // Ensure arrays are never null
      critical_keywords: item.critical_keywords || [],
      high_keywords: item.high_keywords || [],
      medium_keywords: item.medium_keywords || [],
      exclude_keywords: item.exclude_keywords || [],
      notify_agent_ids: item.notify_agent_ids || [],
      notify_emails: item.notify_emails || [],
      // Parse JSONB fields
      classification_rules: item.classification_rules || {},
      watch_schedule: item.watch_schedule || { type: 'realtime' },
      rule_metadata: item.rule_metadata || {},
    }));
    
    return NextResponse.json({
      success: true,
      items,
      count: items.length,
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

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      name, 
      pattern, 
      rule_type = 'keyword_match',
      action_type = 'alert',
      
      // Keywords
      critical_keywords = [],
      high_keywords = [],
      medium_keywords = [],
      exclude_keywords = [],
      classification_rules = {},
      
      // Reply config
      reply_scope = 'none',
      auto_reply_enabled = false,
      auto_reply_template,
      
      // Follow-up timing
      follow_up_default_hours = 24,
      follow_up_urgent_hours = 4,
      follow_up_critical_hours = 1,
      auto_summarize = false,
      
      // Routing
      notify_agent_ids = [],
      notify_emails = [],
      escalation_agent_id,
      
      // Scope
      company_id,
      email_account,
      folder_pattern = 'inbox',
      watch_schedule = { type: 'realtime' },
      
      // Execution
      auto_execute = false,
      require_approval = false,
      max_daily_alerts = 100,
      cooldown_minutes = 5,
      
      // Metadata
      description,
      rule_metadata = {},
      owner_id,
    } = body;
    
    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'name is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    if (!pattern || typeof pattern !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'pattern is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Build complete payload with ALL metadata
    const insertPayload = {
      id,
      name,
      pattern,
      rule_type,
      action_type,
      is_active: true,
      
      // Keywords
      critical_keywords: Array.isArray(critical_keywords) ? critical_keywords : [],
      high_keywords: Array.isArray(high_keywords) ? high_keywords : [],
      medium_keywords: Array.isArray(medium_keywords) ? medium_keywords : [],
      exclude_keywords: Array.isArray(exclude_keywords) ? exclude_keywords : [],
      classification_rules: classification_rules || {},
      
      // Reply config
      reply_scope,
      auto_reply_enabled,
      auto_reply_template,
      
      // Follow-up
      follow_up_default_hours,
      follow_up_urgent_hours,
      follow_up_critical_hours,
      auto_summarize,
      
      // Routing
      notify_agent_ids: Array.isArray(notify_agent_ids) ? notify_agent_ids : [],
      notify_emails: Array.isArray(notify_emails) ? notify_emails : [],
      escalation_agent_id,
      
      // Scope
      company_id,
      email_account,
      folder_pattern,
      watch_schedule: watch_schedule || { type: 'realtime' },
      
      // Execution
      auto_execute,
      require_approval,
      max_daily_alerts,
      cooldown_minutes,
      
      // Metadata
      description,
      rule_metadata: rule_metadata || {},
      owner_id,
      
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .insert(insertPayload)
        .select()
        .single();
    }, 'insert_watch_rule');
    
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
      item: data,
      id,
      status: 'created',
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

// PATCH for updates
export async function PATCH(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required for PATCH',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
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
    }, 'update_watch_rule');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
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

// DELETE
export async function DELETE(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .delete()
        .eq('id', id);
    }, 'delete_watch_rule');
    
    const duration = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      deleted: id,
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
