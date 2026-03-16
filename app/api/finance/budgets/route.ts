/**
 * ATLAS-HARVEY-FINANCE-V1
 * GET /api/finance/budgets
 * POST /api/finance/budgets
 * 
 * Budget management for Finance & Legal V1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/finance/budgets
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const fiscalYear = parseInt(searchParams.get('fiscal_year') || String(new Date().getFullYear()));
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!companyId || !['ARQIA', 'XGROUP', 'SENA'].includes(companyId)) {
      return NextResponse.json(
        { success: false, error: 'Valid company_id required (ARQIA, XGROUP, SENA)' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error, count } = await (supabase as any)
      .from('budgets')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('fiscal_year', fiscalYear)
      .order('category', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Budgets GET] Database error:', error);
      throw error;
    }
    
    // Transform to UI shape with camelCase
    const budgets = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name || b.category,
      allocated: b.allocated,
      spent: b.spent,
      remaining: (b.allocated || 0) - (b.spent || 0),
      category: b.category,
      owner: b.created_by,
      status: b.status || 'active',
      fiscalYear: b.fiscal_year,
      department: b.department,
      forecast: b.forecast,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));
    
    return NextResponse.json({
      success: true,
      budgets,
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
    console.error('[Budgets GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}

// POST /api/finance/budgets
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const {
      company_id,
      fiscal_year,
      category,
      allocated,
      created_by,
      name,
      department,
      forecast
    } = body;
    
    // Validation
    const required = ['company_id', 'fiscal_year', 'category', 'allocated', 'created_by'];
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
    
    if (allocated <= 0) {
      return NextResponse.json(
        { success: false, error: 'allocated must be greater than 0' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check for duplicate budget
    const { data: existing } = await (supabase as any)
      .from('budgets')
      .select('id')
      .eq('company_id', company_id)
      .eq('fiscal_year', fiscal_year)
      .eq('category', category)
      .eq('department', department || null)
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Budget already exists for this category/department/year' },
        { status: 409 }
      );
    }
    
    const { data, error } = await (supabase as any)
      .from('budgets')
      .insert({
        company_id,
        fiscal_year,
        category,
        department: department || null,
        allocated,
        spent: 0,
        forecast: forecast || allocated,
        created_by,
        name: name || category,
        status: 'active',
        updated_at: timestamp
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Budgets POST] Database error:', error);
      throw error;
    }
    
    // Transform response
    const budget = {
      id: data.id,
      name: data.name,
      allocated: data.allocated,
      spent: data.spent,
      remaining: data.allocated - data.spent,
      category: data.category,
      owner: data.created_by,
      status: data.status,
      fiscalYear: data.fiscal_year,
      department: data.department,
      forecast: data.forecast,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json({
      success: true,
      budget,
      timestamp,
      source: 'finance_api'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Budgets POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}