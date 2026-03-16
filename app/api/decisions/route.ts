/**
 * ATLAS-DECISIONS API
 * ATLAS-PRIME-EO-ROUTE-MAPPING-CLOSEOUT-133
 * 
 * GET /api/decisions
 * Returns pending decisions for executive review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const status = searchParams.get('status') || 'pending';
    
    const supabase = getSupabaseAdmin();
    
    // Try to fetch from decisions table
    const { data, error } = await (supabase as any)
      .from('decisions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      // Return empty array if table doesn't exist
      return NextResponse.json([]);
    }
    
    return NextResponse.json(data || []);
    
  } catch (error: any) {
    return NextResponse.json([]);
  }
}
