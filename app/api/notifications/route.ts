/**
 * ATLAS-NOTIFICATIONS API
 * ATLAS-PRIME-EXEC-OPS-CLEAN-UI-9802
 * 
 * GET /api/notifications
 * Returns REAL notifications from database + WhatsApp messages from communications
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
    
    // Query notifications
    let notifQuery = (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      notifQuery = notifQuery.eq('read', false);
    }
    
    const { data: notificationsData, error: notifError, count: notifCount } = await notifQuery;
    
    if (notifError) {
      console.error('[Notifications] Query error:', notifError);
    }
    
    // Query WhatsApp messages from communications
    const { data: whatsappData, error: whatsappError } = await (supabase as any)
      .from('communications')
      .select('*')
      .eq('source_channel', 'whatsapp')
      .in('status', ['received', 'summarized'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (whatsappError) {
      console.error('[Notifications] WhatsApp query error:', whatsappError);
    }
    
    // Transform WhatsApp messages to notification format
    const whatsappNotifications = (whatsappData || []).map((msg: any) => ({
      id: `whatsapp-${msg.id}`,
      title: msg.sender || 'WhatsApp Message',
      message: msg.content || msg.subject || 'New message',
      type: 'info',
      createdAt: msg.created_at,
      read: msg.status !== 'received', // Mark as read if processed
      source: 'whatsapp',
      thread_id: msg.thread_id,
      priority: msg.priority || 'normal'
    }));
    
    // Combine and sort all notifications
    const allNotifications = [
      ...(notificationsData || []),
      ...whatsappNotifications
    ].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.created_at).getTime();
      const dateB = new Date(b.createdAt || b.created_at).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, limit);
    
    const unreadCount = allNotifications.filter((n: any) => !n.read).length;
    
    return NextResponse.json({
      notifications: allNotifications,
      unreadCount,
      total: (notifCount || 0) + (whatsappData?.length || 0),
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
