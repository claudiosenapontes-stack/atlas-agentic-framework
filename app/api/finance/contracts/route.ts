/**
 * ATLAS-HARVEY-FINANCE-V1
 * GET /api/finance/contracts
 * POST /api/finance/contracts
 * 
 * Contract management for Finance & Legal V1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/finance/contracts
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const status = searchParams.get('status');
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
      .from('contracts')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('end_date', { ascending: true });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Contracts GET] Database error:', error);
      throw error;
    }
    
    // Transform to UI shape with camelCase
    const now = new Date();
    const contracts = (data || []).map((c: any) => {
      const endDate = c.end_date ? new Date(c.end_date) : null;
      const daysUntilExpiry = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      return {
        id: c.id,
        title: c.title || `${c.counterparty} - ${c.contract_type}`,
        counterparty: c.counterparty,
        value: c.value || 0,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        legalPrivilege: c.visibility === 'confidential',
        contractType: c.contract_type,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90,
        createdBy: c.created_by,
        createdAt: c.created_at
      };
    });
    
    return NextResponse.json({
      success: true,
      contracts,
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
    console.error('[Contracts GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}

// POST /api/finance/contracts
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const {
      company_id,
      counterparty,
      contract_type,
      start_date,
      created_by,
      value,
      end_date,
      status,
      visibility,
      title
    } = body;
    
    // Validation
    const required = ['company_id', 'counterparty', 'contract_type', 'start_date', 'created_by'];
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
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : null;
    
    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'end_date must be after start_date' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('contracts')
      .insert({
        company_id,
        counterparty,
        contract_type,
        start_date,
        end_date: end_date || null,
        value: value || 0,
        status: status || 'draft',
        visibility: visibility || 'confidential',
        title: title || `${counterparty} - ${contract_type}`,
        created_by
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Contracts POST] Database error:', error);
      throw error;
    }
    
    // Transform response
    const contract = {
      id: data.id,
      title: data.title,
      counterparty: data.counterparty,
      value: data.value,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      legalPrivilege: data.visibility === 'confidential',
      contractType: data.contract_type,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
    
    return NextResponse.json({
      success: true,
      contract,
      timestamp,
      source: 'finance_api'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Contracts POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}