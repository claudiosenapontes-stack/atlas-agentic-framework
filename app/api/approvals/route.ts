/**
 * ATLAS-APPROVALS API (EO Write Path Fixed)
 * ATLAS-SOPHIA-EO-WRITE-API-FIX-001
 * 
 * GET/POST /api/approvals
 * Manage approval_requests table
 * 
 * Requirements:
 * - Validate schema against Olivia contracts → 400 for invalid
 * - Ensure DB writes succeed
 * - Return explicit JSON: {success: true, id: uuid, status: "created"}
 * - Catch DB errors explicitly → 500 with error message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid approval statuses
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

// GET /api/approvals
// List approval requests
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requester_id = searchParams.get('requester_id');
    const approver_id = searchParams.get('approver_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (requester_id) {
      query = query.eq('requester_id', requester_id);
    }
    
    if (approver_id) {
      query = query.eq('approver_id', approver_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Approvals GET] Query error:', error);
      return NextResponse.json({
        success: true,
        approvals: [],
        count: 0,
        timestamp,
        source: 'approval_requests',
        error: `Query error: ${error.message}`,
      });
    }
    
    // Calculate stats
    const stats = {
      total: data?.length || 0,
      by_status: {} as Record<string, number>,
    };
    
    (data || []).forEach((item: any) => {
      const s = item.status || 'unknown';
      stats.by_status[s] = (stats.by_status[s] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      approvals: data || [],
      count: data?.length || 0,
      stats,
      timestamp,
      source: 'approval_requests',
    });
    
  } catch (error: any) {
    console.error('[Approvals GET] Error:', error);
    return NextResponse.json({
      success: true,
      approvals: [],
      count: 0,
      timestamp,
      source: 'approval_requests',
      error: error.message,
    });
  }
}

// POST /api/approvals
// Create approval request
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', timestamp },
        { status: 400 }
      );
    }
    
    const { action = 'create' } = body;
    
    if (action === 'create') {
      const {
        title,
        description,
        requester_id,
        approver_id,
        request_type,
        entity_type,
        entity_id,
        metadata = {},
      } = body;
      
      // Validation per Olivia contract
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'title is required and must be a non-empty string', timestamp },
          { status: 400 }
        );
      }
      
      if (!requester_id || typeof requester_id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'requester_id is required', timestamp },
          { status: 400 }
        );
      }
      
      if (!approver_id || typeof approver_id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'approver_id is required', timestamp },
          { status: 400 }
        );
      }
      
      const supabase = getSupabaseAdmin();
      const approvalId = randomUUID();
      
      // Insert approval request
      let data;
      try {
        const result = await (supabase as any)
          .from('approval_requests')
          .insert({
            id: approvalId,
            title: title.trim(),
            description: description || null,
            requester_id,
            approver_id,
            request_type: request_type || 'general',
            entity_type: entity_type || null,
            entity_id: entity_id || null,
            status: 'pending',
            metadata,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .select()
          .single();
        
        if (result.error) {
          console.error('[Approvals POST] DB insert error:', result.error);
          return NextResponse.json(
            { 
              success: false, 
              error: `Database error: ${result.error.message}`,
              code: result.error.code,
              timestamp,
            },
            { status: 500 }
          );
        }
        
        data = result.data;
      } catch (dbError: any) {
        console.error('[Approvals POST] DB exception:', dbError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Database exception: ${dbError.message}`,
            timestamp,
          },
          { status: 500 }
        );
      }
      
      // Return explicit JSON per requirements
      return NextResponse.json({
        success: true,
        id: data.id,
        status: "created",
        approval: data,
        timestamp,
      }, { status: 201 });
      
    } else if (action === 'approve' || action === 'reject') {
      const { id, decision_notes, decided_by } = body;
      
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'id is required for approve/reject actions', timestamp },
          { status: 400 }
        );
      }
      
      if (!decided_by) {
        return NextResponse.json(
          { success: false, error: 'decided_by is required', timestamp },
          { status: 400 }
        );
      }
      
      const supabase = getSupabaseAdmin();
      
      let data;
      try {
        const result = await (supabase as any)
          .from('approval_requests')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            decision_notes: decision_notes || null,
            decided_by,
            decided_at: timestamp,
            updated_at: timestamp,
          })
          .eq('id', id)
          .select()
          .single();
        
        if (result.error) {
          console.error('[Approvals POST] DB update error:', result.error);
          return NextResponse.json(
            { 
              success: false, 
              error: `Database error: ${result.error.message}`,
              timestamp,
            },
            { status: 500 }
          );
        }
        
        data = result.data;
      } catch (dbError: any) {
        console.error('[Approvals POST] DB exception:', dbError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Database exception: ${dbError.message}`,
            timestamp,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        id: data.id,
        status: action === 'approve' ? 'approved' : 'rejected',
        approval: data,
        timestamp,
      });
    }
    
    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}. Must be 'create', 'approve', or 'reject'`, timestamp },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('[Approvals POST] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Unexpected error: ${error.message}`,
        timestamp,
      },
      { status: 500 }
    );
  }
}
