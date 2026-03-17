/**
 * POST /api/missions/:id/close - RAIL-HARDENED v3
 * ATLAS-OPTIMUS-MISSION-CLOSURE-FIX-9501
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - Centralized retry from supabase-admin
 * - Safe evidence_bundle handling
 * - All DB calls wrapped with withDbRetry
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestId = () => randomUUID().slice(0, 8);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    // Parse body with timeout
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('body parse timeout')), 2000))
    ]) as any;
    
    const { closure_notes, closed_by } = body || {};
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // Get mission with retry
    const mission = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,status,evidence_bundle')
        .eq('id', missionId)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data;
    }, 'get_mission_for_close');
    
    if (!mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    if (mission.status === 'closed') {
      return NextResponse.json({
        success: false,
        error: 'Mission already closed',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // Safely handle evidence_bundle
    const currentEvidence = mission.evidence_bundle || {};
    
    // Update mission with retry
    const updatedMission = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('missions')
        .update({
          status: 'closed',
          phase: 'closure',
          actual_end_date: timestamp,
          progress_percent: 100,
          evidence_bundle: {
            ...currentEvidence,
            closure: { closed_at: timestamp, closed_by: closed_by || null, notes: closure_notes || null }
          },
          updated_at: timestamp
        })
        .eq('id', missionId)
        .select('id,status,phase,progress_percent,actual_end_date')
        .single();
      
      if (error) throw error;
      return data;
    }, 'close_mission');
    
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/close',
      requestId: rid,
      missionId,
      duration,
      errorSource: null,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    const errorSource = isTimeout ? 'db_timeout' : 'db_connection';
    
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions/:id/close',
      requestId: rid,
      missionId,
      duration,
      error: error.message,
      errorSource,
      success: false
    }));
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Database timeout - please retry' : error.message,
      requestId: rid,
      duration,
      errorSource,
      retryable: isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
