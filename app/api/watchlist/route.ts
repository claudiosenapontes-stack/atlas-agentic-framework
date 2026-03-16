/**
 * ATLAS-WATCHLIST API (EO Backend Closeout)
 * ATLAS-OPTIMUS-EO-BACKEND-CLOSEOUT-104
 * 
 * GET/POST /api/watchlist
 * Minimal implementation for EO closeout
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['lead', 'company', 'contact', 'opportunity', 'task', 'event', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['active', 'resolved', 'dismissed', 'archived'];

// GET /api/watchlist
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const owner_id = searchParams.get('owner_id');
    const company_id = searchParams.get('company_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('watchlist_items')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (priority) query = query.eq('priority', priority);
    if (owner_id) query = query.eq('owner_id', owner_id);
    if (company_id) query = query.eq('company_id', company_id);
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        timestamp,
        error: error.message,
      });
    }
    
    return NextResponse.json({
      success: true,
      items: data || [],
      count: data?.length || 0,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      items: [],
      count: 0,
      timestamp,
      error: error.message,
    });
  }
}

// POST /api/watchlist - Minimal implementation
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { action = 'create' } = body;
    
    if (action === 'create') {
      const { title, category, priority = 'medium', status = 'active', company_id } = body;
      
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'title is required', timestamp },
          { status: 400 }
        );
      }
      
      if (category && !VALID_CATEGORIES.includes(category.toLowerCase())) {
        return NextResponse.json(
          { success: false, error: `Invalid category`, timestamp },
          { status: 400 }
        );
      }
      
      const supabase = getSupabaseAdmin();
      const watchlistId = randomUUID();
      
      // Minimal insert - only confirmed columns
      const { error: insertError } = await (supabase as any)
        .from('watchlist_items')
        .insert({
          id: watchlistId,
          subject: title.trim(),
          category: category || 'other',
          priority: priority.toLowerCase(),
          status: status.toLowerCase(),
          company_id: company_id || null,
          created_at: timestamp,
          updated_at: timestamp,
        });
      
      if (insertError) {
        return NextResponse.json(
          { success: false, error: `Database error: ${insertError.message}`, code: insertError.code, timestamp },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        id: watchlistId,
        status: "created",
        timestamp,
      }, { status: 201 });
    }
    
    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}`, timestamp },
      { status: 400 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, timestamp },
      { status: 500 }
    );
  }
}
