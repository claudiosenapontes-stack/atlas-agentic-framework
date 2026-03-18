/**
 * ATLAS-APPROVALS PATCH API
 * ATLAS-MSN-9857
 * 
 * PATCH /api/approvals/:id
 * Update approval status (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).slice(2, 10);
  const startTime = Date.now();
  
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'status must be "approved" or "rejected"',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('approvals')
        .update({ 
          status,
          updated_at: timestamp 
        })
        .eq('id', id)
        .select()
        .single();
    }, 'update_approval');
    
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
    
    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Approval not found',
        timestamp,
        requestId,
        duration,
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      approval: data,
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
