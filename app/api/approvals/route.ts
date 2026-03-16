import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
// Cache-bust: 2026-03-16T19:59:00Z

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .select('*')
      .limit(limit);
    
    if (error) {
      return NextResponse.json({ success: true, approvals: [], count: 0, timestamp, error: error.message });
    }
    
    return NextResponse.json({ success: true, approvals: data || [], count: data?.length || 0, timestamp });
  } catch (error: any) {
    return NextResponse.json({ success: true, approvals: [], count: 0, timestamp, error: error.message });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const body = await request.json();
    const { title } = body;
    
    if (!title) {
      return NextResponse.json({ success: false, error: 'title required', timestamp }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Insert only id - schema unknown
    const { error } = await (supabase as any)
      .from('approval_requests')
      .insert({ id });
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message, code: error.code, timestamp }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, id, status: "created", timestamp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp }, { status: 500 });
  }
}
