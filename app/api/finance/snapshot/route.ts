/**
 * ATLAS-HARVEY-FINANCE-V1
 * GET /api/finance/snapshot
 * 
 * Dashboard aggregation for Finance Overview
 * Returns: totalBudget, spentYTD, pendingApprovals, outstandingInvoices, activeContracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/finance/snapshot
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    
    if (!companyId || !['ARQIA', 'XGROUP', 'SENA'].includes(companyId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid company_id required (ARQIA, XGROUP, SENA)',
          timestamp 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const fiscalYear = new Date().getFullYear();
    
    // Parallel aggregation queries
    const [
      { data: budgets, error: budgetError },
      { data: invoices, error: invoiceError },
      { data: contracts, error: contractError },
      { data: approvals, error: approvalError }
    ] = await Promise.all([
      // Total budget and spent for current fiscal year
      (supabase as any)
        .from('budgets')
        .select('allocated, spent')
        .eq('company_id', companyId)
        .eq('fiscal_year', fiscalYear),
      
      // Outstanding invoices (pending status)
      (supabase as any)
        .from('invoices')
        .select('id, status')
        .eq('company_id', companyId),
      
      // Active contracts
      (supabase as any)
        .from('contracts')
        .select('id, status')
        .eq('company_id', companyId),
      
      // Pending approvals
      (supabase as any)
        .from('approvals')
        .select('id, status')
        .eq('company_id', companyId)
    ]);
    
    // Check for errors
    if (budgetError) {
      console.error('[Snapshot] Budget query error:', budgetError);
      throw new Error(`Budget query failed: ${budgetError.message}`);
    }
    if (invoiceError) {
      console.error('[Snapshot] Invoice query error:', invoiceError);
      throw new Error(`Invoice query failed: ${invoiceError.message}`);
    }
    if (contractError) {
      console.error('[Snapshot] Contract query error:', contractError);
      throw new Error(`Contract query failed: ${contractError.message}`);
    }
    if (approvalError) {
      console.error('[Snapshot] Approval query error:', approvalError);
      throw new Error(`Approval query failed: ${approvalError.message}`);
    }
    
    // Calculate aggregates
    const totalBudget = (budgets || []).reduce((sum: number, b: any) => sum + (Number(b.allocated) || 0), 0);
    const spentYTD = (budgets || []).reduce((sum: number, b: any) => sum + (Number(b.spent) || 0), 0);
    const pendingApprovals = (approvals || []).filter((a: any) => a.status === 'pending').length;
    const outstandingInvoices = (invoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length;
    const activeContracts = (contracts || []).filter((c: any) => c.status === 'active').length;
    
    return NextResponse.json({
      success: true,
      totalBudget,
      spentYTD,
      pendingApprovals,
      outstandingInvoices,
      activeContracts,
      companyId,
      fiscalYear,
      timestamp,
      source: 'finance_api'
    });
    
  } catch (error: any) {
    console.error('[Snapshot] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch finance snapshot',
        timestamp 
      },
      { status: 500 }
    );
  }
}