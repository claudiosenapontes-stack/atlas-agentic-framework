/**
 * ATLAS-DECISIONS API
 * ATLAS-PRIME-EXEC-OPS-CLEAN-UI-9802
 * 
 * GET /api/decisions
 * Returns REAL pending decisions from approval_requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status') || 'pending';
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[Decisions] Query error:', error);
      return NextResponse.json({
        success: false,
        decisions: [],
        timestamp,
        error: error.message,
        build_marker: 'EXEC-OPS-CLEAN-9802'
      });
    }
    
    // Map approval_requests to decision format
    const decisions = (data || []).map((a: any) => ({
      id: a.id,
      title: a.title || a.description || 'Untitled Request',
      impact: a.amount && a.amount > 10000 ? 'high' : a.amount && a.amount > 1000 ? 'medium' : 'low',
      status: a.status,
      dueDate: a.due_date || a.created_at,
      amount: a.amount,
      created_at: a.created_at
    }));
    
    return NextResponse.json({
      success: true,
      decisions,
      count: decisions.length,
      timestamp,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
    
  } catch (error: any) {
    console.error('[Decisions] Error:', error);
    return NextResponse.json({
      success: false,
      decisions: [],
      timestamp,
      error: error.message,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
  }
}
