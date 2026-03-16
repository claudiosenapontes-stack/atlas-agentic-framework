/**
 * ATLAS-APPROVALS API (EO Backend Closeout)
 * ATLAS-OPTIMUS-EO-BACKEND-CLOSEOUT-104
 * 
 * GET/POST /api/approvals
 * Minimal implementation for EO closeout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

// GET /api/approvals
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requester_id = searchParams.get('requester_id');
    const approver_id = searchParams.get('approver_id');
    const company_id = searchParams.get('company_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    const supabase = getSupabaseAdmin();
    
    // Check if table exists
    const { error: tableCheckError } = await (supabase as any)
      .from('approval_requests')
      .select('id', { count: 'exact', head: true });
    
    if (tableCheckError) {
      return NextResponse.json({
        success: false,
        error: `Database error: ${tableCheckError.message}`,
        code: tableCheckError.code,
        timestamp,
      }, { status: 500 });
    }
    
    let query = (supabase as any)
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) query = query.eq('status', status);
    if (requester_id) query = query.eq('requester_id', requester_id);
    if (approver_id) query = query.eq('approver_id', approver_id);
    if (company_id) query = query.eq('company_id', company_id);
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({
        success: true,
        approvals: [],
        count: 0,
        timestamp,
        error: error.message,
      });
    }
    
    return NextResponse.json({
      success: true,
      approvals: data || [],
      count: data?.length || 0,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      approvals: [],
      count: 0,
      timestamp,
      error: error.message,
    });
  }
}

// POST /api/approvals - Minimal implementation
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { action = 'create' } = body;
    
    if (action === 'create') {
      const { title, requester_id, approver_id, description } = body;
      
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'title is required', timestamp },
          { status: 400 }
        );
      }
      
      if (!requester_id) {
        return NextResponse.json(
          { success: false, error: 'requester_id is required', timestamp },
          { status: 400 }
        );
      }
      
      if (!approver_id) {
        return NextResponse.json(
          { success: false, error: 'approver_id is required', timestamp },
          { status: 400 }
        );
      }
      
      const supabase = getSupabaseAdmin();
      const approvalId = randomUUID();
      
      // Minimal insert - only confirmed columns
      const insertData: any = {
        id: approvalId,
        title: title.trim(),
        requester_id,
        approver_id,
        status: 'pending',
        created_at: timestamp,
        updated_at: timestamp,
      };
      
      if (description) insertData.description = description;
      
      const { error: insertError } = await (supabase as any)
        .from('approval_requests')
        .insert(insertData);
      
      if (insertError) {
        return NextResponse.json(
          { success: false, error: `Database error: ${insertError.message}`, code: insertError.code, timestamp },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        id: approvalId,
        status: "created",
        timestamp,
      }, { status: 201 });
    }
    
    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}`, timestamp },
      { status: 400 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}
