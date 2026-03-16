/**
 * ATLAS-APPROVALS API
 * ATLAS-OPTIMUS-EO-INSERT-DIAGNOSTIC-140
 * 
 * GET/POST /api/approvals
 * With structured logging for insert diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] GET /api/approvals started`);
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    console.log(`[${requestId}] Supabase admin client initialized`);
    
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .select('id, type, status, created_at')
      .limit(50);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] SELECT completed in ${duration}ms`, { count: data?.length, error: error?.message });
    
    if (error) {
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
      approvals: data || [],
      count: data?.length || 0,
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

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] POST /api/approvals started`);
  const startTime = Date.now();
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body parsed:`, JSON.stringify(body));
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const { title, description, amount, requester_id } = body;
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      console.log(`[${requestId}] Validation failed: title required`);
      return NextResponse.json({
        success: false,
        error: 'title is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    // Initialize admin client
    console.log(`[${requestId}] Initializing Supabase admin client...`);
    let supabase;
    try {
      supabase = getSupabaseAdmin();
      console.log(`[${requestId}] Supabase admin client initialized successfully`);
    } catch (e: any) {
      console.error(`[${requestId}] Failed to initialize Supabase client:`, e);
      return NextResponse.json({
        success: false,
        error: `Supabase client init failed: ${e.message}`,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    // Build payload
    const id = randomUUID();
    const insertPayload: any = {
      id,
      type: 'general',
      status: 'pending',
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Add optional fields if provided
    if (description) insertPayload.description = description;
    if (amount !== undefined) insertPayload.amount = amount;
    if (requester_id) insertPayload.requester_id = requester_id;
    
    console.log(`[${requestId}] Insert payload:`, JSON.stringify(insertPayload));
    console.log(`[${requestId}] Table: approval_requests`);
    console.log(`[${requestId}] Executing INSERT...`);
    
    // Execute insert with timing
    const insertStart = Date.now();
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .insert(insertPayload)
      .select()
      .single();
    
    const insertDuration = Date.now() - insertStart;
    const totalDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] INSERT completed in ${insertDuration}ms`);
    console.log(`[${requestId}] Total request time: ${totalDuration}ms`);
    console.log(`[${requestId}] Supabase response:`, { 
      data: data ? 'present' : 'null', 
      error: error ? { message: error.message, code: error.code, details: error.details } : null 
    });
    
    if (error) {
      console.error(`[${requestId}] INSERT ERROR:`, error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp,
        requestId,
        duration: insertDuration,
      }, { status: 500 });
    }
    
    console.log(`[${requestId}] INSERT SUCCESS:`, { id, duration: insertDuration });
    
    return NextResponse.json({
      success: true,
      approval: data,
      id,
      status: 'created',
      timestamp,
      requestId,
      duration: insertDuration,
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
