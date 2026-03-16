/**
 * ATLAS-HARVEY-FINANCE-V1
 * GET /api/finance/invoices
 * POST /api/finance/invoices
 * 
 * Invoice management for Finance & Legal V1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/finance/invoices
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
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Invoices GET] Database error:', error);
      throw error;
    }
    
    // Transform to UI shape with camelCase
    const now = new Date();
    const invoices = (data || []).map((i: any) => {
      const dueDate = i.due_date ? new Date(i.due_date) : null;
      const isOverdue = i.status === 'pending' && dueDate && dueDate < now;
      
      return {
        id: i.id,
        vendor: i.vendor_name,
        amount: i.amount,
        status: isOverdue ? 'overdue' : i.status,
        dueDate: i.due_date,
        invoiceNumber: i.invoice_number,
        createdBy: i.created_by,
        createdAt: i.created_at,
        isOverdue: isOverdue
      };
    });
    
    return NextResponse.json({
      success: true,
      invoices,
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
    console.error('[Invoices GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}

// POST /api/finance/invoices
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const {
      company_id,
      vendor_name,
      invoice_number,
      amount,
      due_date,
      created_by,
      status
    } = body;
    
    // Validation
    const required = ['company_id', 'vendor_name', 'invoice_number', 'amount', 'due_date', 'created_by'];
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
    
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check for duplicate invoice number
    const { data: existing } = await (supabase as any)
      .from('invoices')
      .select('id')
      .eq('company_id', company_id)
      .eq('invoice_number', invoice_number)
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice number already exists for this company' },
        { status: 409 }
      );
    }
    
    const { data, error } = await (supabase as any)
      .from('invoices')
      .insert({
        company_id,
        vendor_name,
        invoice_number,
        amount,
        due_date,
        status: status || 'pending',
        created_by
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Invoices POST] Database error:', error);
      throw error;
    }
    
    // Transform response
    const invoice = {
      id: data.id,
      vendor: data.vendor_name,
      amount: data.amount,
      status: data.status,
      dueDate: data.due_date,
      invoiceNumber: data.invoice_number,
      createdBy: data.created_by,
      createdAt: data.created_at,
      isOverdue: false
    };
    
    return NextResponse.json({
      success: true,
      invoice,
      timestamp,
      source: 'finance_api'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Invoices POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}