/**
 * ATLAS-EXECUTIVE-OPS-SNAPSHOT API
 * ATLAS-PRIME-EO-ROUTE-MAPPING-CLOSEOUT-133
 * 
 * GET /api/executive-ops/snapshot
 * Returns executive dashboard snapshot data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Get counts from various tables
    const [
      { count: watchlistCount },
      { count: approvalsCount },
      { count: followupsCount },
      { count: meetingsCount },
      { count: decisionsCount },
    ] = await Promise.all([
      supabase.from('watchlist_items').select('*', { count: 'exact', head: true }),
      supabase.from('approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('executive_events').select('*', { count: 'exact', head: true }).gte('start_time', timestamp),
      supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    
    return NextResponse.json({
      priorities: [],
      meetingsToday: meetingsCount || 0,
      pendingDecisions: decisionsCount || 0,
      watchlistItems: watchlistCount || 0,
      pendingApprovals: approvalsCount || 0,
      pendingFollowups: followupsCount || 0,
      unreadNotifications: 0,
      timestamp,
    });
    
  } catch (error: any) {
    // Return empty snapshot on error
    return NextResponse.json({
      priorities: [],
      meetingsToday: 0,
      pendingDecisions: 0,
      watchlistItems: 0,
      pendingApprovals: 0,
      pendingFollowups: 0,
      unreadNotifications: 0,
      timestamp,
    });
  }
}
