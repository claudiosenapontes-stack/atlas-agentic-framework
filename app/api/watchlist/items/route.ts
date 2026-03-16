/**
 * ATLAS-WATCHLIST-ITEMS API
 * ATLAS-OPTIMUS-EO-CLOSURE-PASS-003
 * 
 * GET /api/watchlist/items
 * List watchlist items with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid filter values
const VALID_CATEGORIES = ['lead', 'company', 'contact', 'opportunity', 'task', 'event', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['active', 'resolved', 'dismissed', 'archived'];

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const owner_id = searchParams.get('owner_id');
    const company_id = searchParams.get('company_id');
    const entity_type = searchParams.get('entity_type');
    const entity_id = searchParams.get('entity_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('watchlist_items')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, timestamp },
          { status: 400 }
        );
      }
      query = query.eq('status', status);
    }
    
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, timestamp },
          { status: 400 }
        );
      }
      query = query.eq('category', category);
    }
    
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json(
          { success: false, error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, timestamp },
          { status: 400 }
        );
      }
      query = query.eq('priority', priority);
    }
    
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    
    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Watchlist Items GET] Query error:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}`, timestamp },
        { status: 500 }
      );
    }
    
    // Calculate stats
    const stats = {
      total: count || 0,
      returned: data?.length || 0,
      by_status: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
    };
    
    (data || []).forEach((item: any) => {
      const s = item.status || 'unknown';
      const p = item.priority || 'unknown';
      stats.by_status[s] = (stats.by_status[s] || 0) + 1;
      stats.by_priority[p] = (stats.by_priority[p] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      items: data || [],
      count: data?.length || 0,
      total: count || 0,
      stats,
      timestamp,
      source: 'watchlist_items',
    });
    
  } catch (error: any) {
    console.error('[Watchlist Items GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}

// POST /api/watchlist/items
// Create a new watchlist item
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    // Validation
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required and must be non-empty', timestamp },
        { status: 400 }
      );
    }
    
    const VALID_CATEGORIES = ['lead', 'company', 'contact', 'opportunity', 'task', 'event', 'other'];
    const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
    const VALID_STATUSES = ['active', 'resolved', 'dismissed', 'archived'];
    
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}`, timestamp },
        { status: 400 }
      );
    }
    
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`, timestamp },
        { status: 400 }
      );
    }
    
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}`, timestamp },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const itemId = randomUUID();
    
    const { data, error } = await (supabase as any)
      .from('watchlist_items')
      .insert({
        id: itemId,
        title: body.title.trim(),
        description: body.description || null,
        category: body.category || 'other',
        entity_type: body.entity_type || null,
        entity_id: body.entity_id || null,
        entity_name: body.entity_name || null,
        priority: body.priority || 'medium',
        status: body.status || 'active',
        owner_id: body.owner_id || null,
        company_id: body.company_id || null,
        reason: body.reason || null,
        alert_triggered_at: body.alert_triggered_at || null,
        metadata: body.metadata || {},
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Watchlist Items POST] DB error:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}`, timestamp },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      id: data.id,
      status: 'created',
      item: data,
      timestamp,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Watchlist Items POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}