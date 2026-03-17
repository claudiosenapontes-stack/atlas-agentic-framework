/**
 * ATLAS-WATCHLIST API
 * ATLAS-OPTIMUS-EXEC-ENDPOINTS-FIX-9819
 * 
 * GET/POST /api/watchlist
 * Fixed to use correct schema: watch_rules and watch_alerts
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
    
    // Query watch_alerts (the actual watchlist items)
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    }, 'get_watch_alerts');
    
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
      const subject = (item.source_subject || item.content_preview || '').toLowerCase();
      if (!subject || subject === 'none') return false;
      return !testPatterns.some(pattern => subject.includes(pattern));
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
      content_preview,
      source_subject,
      source_sender 
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
    
    // Build payload for watch_rules (the proper table)
    const insertPayload: any = {
      id,
      name,
      pattern,
      rule_type,
      action_type,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Add optional fields
    if (body.description) insertPayload.description = body.description;
    if (body.owner_id) insertPayload.owner_id = body.owner_id;
    if (body.company_id) insertPayload.company_id = body.company_id;
    if (body.email_account) insertPayload.email_account = body.email_account;
    
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
