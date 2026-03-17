/**
 * ATLAS-EXECUTIVE-OPS-SNAPSHOT API
 * ATLAS-PRIME-EXEC-OPS-CLEAN-UI-9802
 * 
 * GET /api/executive-ops/snapshot
 * Returns REAL executive dashboard snapshot data from live sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Query all data sources in parallel
    const [
      meetingsResult,
      watchlistResult,
      approvalsResult,
      notificationsResult,
      missionsResult,
      followupsResult
    ] = await Promise.allSettled([
      // Today's meetings
      (supabase as any)
        .from('executive_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', today)
        .lt('start_time', tomorrow)
        .in('status', ['confirmed', 'pending']),
      
      // Watchlist items
      (supabase as any)
        .from('watchlist_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Pending approvals
      (supabase as any)
        .from('approvals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Unread notifications
      (supabase as any)
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false),
      
      // Active missions (priorities)
      (supabase as any)
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'in_progress'])
        .is('deleted_at', null),
      
      // Pending followups
      (supabase as any)
        .from('followups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ]);
    
    // Extract counts safely
    const getCount = (result: PromiseSettledResult<any>) => 
      result.status === 'fulfilled' && !result.value.error 
        ? (result.value.count || 0) 
        : 0;
    
    const meetingsToday = getCount(meetingsResult);
    const watchlistItems = getCount(watchlistResult);
    const pendingApprovals = getCount(approvalsResult);
    const unreadNotifications = getCount(notificationsResult);
    const activeMissions = getCount(missionsResult);
    const pendingFollowups = getCount(followupsResult);
    
    // Build priorities list from active missions
    let priorities: any[] = [];
    if (missionsResult.status === 'fulfilled' && !missionsResult.value.error) {
      const { data: missions } = await (supabase as any)
        .from('missions')
        .select('id, title, status, priority, progress_percent, current_blocker')
        .in('status', ['active', 'in_progress', 'blocked'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      priorities = (missions || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
        progress: m.progress_percent || 0,
        blocked: !!m.current_blocker
      }));
    }
    
    return NextResponse.json({
      priorities,
      meetingsToday,
      pendingDecisions: pendingApprovals, // Map approvals to decisions
      watchlistItems,
      pendingApprovals,
      pendingFollowups,
      unreadNotifications,
      activeMissionCount: activeMissions,
      timestamp,
      source: 'live',
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
    
  } catch (error: any) {
    console.error('[Executive Snapshot] Error:', error);
    // Return empty but marked as error
    return NextResponse.json({
      priorities: [],
      meetingsToday: 0,
      pendingDecisions: 0,
      watchlistItems: 0,
      pendingApprovals: 0,
      pendingFollowups: 0,
      unreadNotifications: 0,
      timestamp,
      source: 'error',
      error: error.message,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
  }
}
