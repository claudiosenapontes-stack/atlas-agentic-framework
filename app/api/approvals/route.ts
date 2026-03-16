import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Build: 2026-03-16T20:00:00Z

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('GET /api/approvals error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message, 
        code: error.code,
        timestamp 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      approvals: data || [], 
      count: data?.length || 0, 
      timestamp 
    });
  } catch (error: any) {
    console.error('GET /api/approvals exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      timestamp 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const body = await request.json();
    const { title, description, amount, requester_id } = body;
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'title is required and must be a string', 
        timestamp 
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Build insert payload with only provided fields
    const insertPayload: any = { 
      id, 
      title,
      status: 'pending'
    };
    
    if (description) insertPayload.description = description;
    if (amount !== undefined) insertPayload.amount = amount;
    if (requester_id) insertPayload.requester_id = requester_id;
    
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) {
      console.error('POST /api/approvals error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message, 
        code: error.code, 
        timestamp 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      approval: data,
      id, 
      status: "created", 
      timestamp 
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/approvals exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      timestamp 
    }, { status: 500 });
  }
}
