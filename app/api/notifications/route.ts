/**
 * ATLAS-NOTIFICATIONS API
 * ATLAS-PRIME-EXEC-OPS-CLEAN-UI-9802
 * 
 * GET /api/notifications
 * Returns REAL notifications from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const unreadOnly = searchParams.get('unread') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Notifications] Query error:', error);
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        timestamp,
        error: error.message,
        build_marker: 'EXEC-OPS-CLEAN-9802'
      });
    }
    
    const unreadCount = (data || []).filter((n: any) => !n.read).length;
    
    return NextResponse.json({
      notifications: data || [],
      unreadCount,
      total: count || 0,
      timestamp,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
    
  } catch (error: any) {
    console.error('[Notifications] Error:', error);
    return NextResponse.json({
      notifications: [],
      unreadCount: 0,
      timestamp,
      error: error.message,
      build_marker: 'EXEC-OPS-CLEAN-9802'
    });
  }
}
