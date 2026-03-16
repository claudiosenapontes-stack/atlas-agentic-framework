/**
 * ATLAS-HARVEY-FINANCE-V1
 * GET /api/finance/approvals
 * POST /api/finance/approvals
 * 
 * Finance approvals using spec-compliant 'approvals' table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/finance/approvals
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const status = searchParams.get('status');
    const approverId = searchParams.get('approver_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!companyId || !['ARQIA', 'XGROUP', 'SENA'].includes(companyId)) {
      return NextResponse.json(
        { success: false, error: 'Valid company_id required (ARQIA, XGROUP, SENA)' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('approvals')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (approverId) {
      query = query.eq('approver_id', approverId);
    }
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Approvals GET] Database error:', error);
      throw error;
    }
    
    // Transform to UI shape with camelCase
    const approvals = (data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      amount: a.amount,
      requester: a.requestor_id,
      category: a.request_type,
      status: a.status,
      requestedAt: a.created_at,
      approverId: a.approver_id,
      companyId: a.company_id
    }));
    
    return NextResponse.json({
      success: true,
      approvals,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      timestamp,
      source: 'finance_api'
    });
    
  } catch (error: any) {
    console.error('[Approvals GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}

// POST /api/finance/approvals
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const {
      company_id,
      request_type,
      requestor_id,
      title,
      amount,
      approver_id
    } = body;
    
    // Validation
    const required = ['company_id', 'request_type', 'requestor_id', 'title', 'approver_id'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }
    
    if (!['ARQIA', 'XGROUP', 'SENA'].includes(company_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company_id. Must be ARQIA, XGROUP, or SENA' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('approvals')
      .insert({
        company_id,
        request_type,
        requestor_id,
        title,
        amount: amount || null,
        approver_id,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Approvals POST] Database error:', error);
      throw error;
    }
    
    // Transform response
    const approval = {
      id: data.id,
      title: data.title,
      amount: data.amount,
      requester: data.requestor_id,
      category: data.request_type,
      status: data.status,
      requestedAt: data.created_at,
      approverId: data.approver_id,
      companyId: data.company_id
    };
    
    return NextResponse.json({
      success: true,
      approval,
      timestamp,
      source: 'finance_api'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Approvals POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}