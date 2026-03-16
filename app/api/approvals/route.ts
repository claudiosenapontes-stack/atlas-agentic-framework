/**
 * ATLAS-APPROVALS API
 * ATLAS-OPTIMUS-EO-BACKEND-STABILITY-134
 * 
 * GET/POST /api/approvals
 * Working implementation with schema-safe columns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .select('id, type, status, created_at')
      .limit(50);
    
    if (error) {
      return NextResponse.json({
        success: true,
        approvals: [],
        count: 0,
        timestamp,
        error: error.message,
      });
    }
    
    return NextResponse.json({
      success: true,
      approvals: data || [],
      count: data?.length || 0,
      timestamp,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      approvals: [],
      count: 0,
      timestamp,
      error: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { title } = body;
    
    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        timestamp,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const id = randomUUID();
    
    // Minimal insert with only confirmed columns
    // Schema: id, type (required), status, created_at, updated_at
    const { error } = await (supabase as any)
      .from('approval_requests')
      .insert({
        id,
        type: 'general',
        status: 'pending',
        created_at: timestamp,
        updated_at: timestamp,
      });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      id,
      status: 'created',
      timestamp,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}
