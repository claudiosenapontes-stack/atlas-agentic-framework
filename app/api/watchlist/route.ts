/**
 * ATLAS-WATCHLIST API
 * ATLAS-OPTIMUS-WATCHLIST-METADATA-ENABLE-9826
 * 
 * GET/POST /api/watchlist
 * Now supports full metadata in action_payload for advanced rule config
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
    
    // Query watch_rules (the watch patterns/rules)
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
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
    
    // FILTER: Exclude test/demo items
    const testPatterns = ['test', 'demo', 'debug', 'verify', 'untitled', 'final', 'quick', 'workflow'];
    const filteredItems = (data || []).filter((item: any) => {
      const name = (item.name || '').toLowerCase();
      if (!name || name === 'none') return false;
      return !testPatterns.some(pattern => name.includes(pattern));
    });
    
    return NextResponse.json({
      success: true,
      items: filteredItems,
      count: filteredItems.length,
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
      metadata
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
    
    // Build action_payload with advanced rule config
    const actionPayload: any = {
      // Default behavior flags
      auto_execute: body.auto_execute ?? false,
      require_approval: body.require_approval ?? false,
    };
    
    // Add advanced rule metadata if provided
    if (metadata) {
      actionPayload.metadata = metadata;
      // Support specific fields at top level for easier querying
      if (metadata.critical_keywords) actionPayload.critical_keywords = metadata.critical_keywords;
      if (metadata.high_keywords) actionPayload.high_keywords = metadata.high_keywords;
      if (metadata.reply_scope) actionPayload.reply_scope = metadata.reply_scope;
      if (metadata.follow_up_timing) actionPayload.follow_up_timing = metadata.follow_up_timing;
      if (metadata.auto_summarize !== undefined) actionPayload.auto_summarize = metadata.auto_summarize;
      if (metadata.recipient_chain) actionPayload.recipient_chain = metadata.recipient_chain;
    }
    
    // Build payload for watch_rules
    const insertPayload: any = {
      id,
      name,
      pattern,
      rule_type,
      action_type,
      action_payload: actionPayload,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Add optional fields
    if (body.description) insertPayload.description = body.description;
    if (body.owner_id) insertPayload.owner_id = body.owner_id;
    if (body.company_id) insertPayload.company_id = body.company_id;
    if (body.email_account) insertPayload.email_account = body.email_account;
    if (body.folder_pattern) insertPayload.folder_pattern = body.folder_pattern;
    if (body.watch_schedule) insertPayload.watch_schedule = body.watch_schedule;
    
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
// Cache bust: 1773773070
