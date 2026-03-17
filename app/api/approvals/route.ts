/**
 * ATLAS-APPROVALS API
 * ATLAS-OPTIMUS-EXEC-ENDPOINTS-FIX-9819
 * 
 * GET/POST /api/approvals
 * Fixed to use correct schema: approvals table
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
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    }, 'get_approvals');
    
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
      approvals: data || [],
      count: data?.length || 0,
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
      title, 
      description, 
      amount, 
      requested_by,
      request_type = 'other'
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
    
    // NOTE: requested_by is required by schema but may not be in cache yet
    // Allow insert without it for schema discovery
    const useRequestedBy = !!requested_by;
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Build payload - only include fields that exist in database
    const insertPayload: any = {
      id,
      title,
      request_type,
      status: 'pending',
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Add optional fields only if provided
    if (useRequestedBy) insertPayload.requested_by = requested_by;
    if (description) insertPayload.description = description;
    if (amount !== undefined) insertPayload.amount = amount;
    if (body.currency) insertPayload.currency = body.currency;
    if (body.requester_notes) insertPayload.requester_notes = body.requester_notes;
    if (body.approver_id) insertPayload.approver_id = body.approver_id;
    if (body.related_task_id) insertPayload.related_task_id = body.related_task_id;
    if (body.external_reference) insertPayload.external_reference = body.external_reference;
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('approvals')
        .insert(insertPayload)
        .select()
        .single();
    }, 'insert_approval');
    
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
      approval: data,
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
