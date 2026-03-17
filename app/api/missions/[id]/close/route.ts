/**
 * POST /api/missions/:id/close - ULTRA-HARDENED
 * ATLAS-OPTIMUS-MISSION-ACTION-ENDPOINTS-CLOSEOUT-1213
 * - Aggressive 2s timeout on ALL DB operations
 * - Minimal field selection
 * - No blocking awaits on non-critical updates
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 2000;
const MAX_RETRY = 2;

async function dbWithTimeout<T>(operation: () => Promise<T>, context: string): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`DB_TIMEOUT:${context}`)), DB_TIMEOUT_MS)
    )
  ]);
}

async function retryOperation<T>(operation: () => Promise<T>, context: string): Promise<T> {
  let lastError;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      return await dbWithTimeout(operation, context);
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRY - 1 && !(error instanceof Error && error.message.includes('TIMEOUT'))) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  }
  throw lastError;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  const startTime = Date.now();
  
  try {
    // Fast body parse with timeout
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('BODY_TIMEOUT')), 500))
    ]) as any;
    
    const { closure_notes, closed_by, closed_by_agent } = body;
    const supabase = getSupabaseAdmin();
    
    // GET mission - minimal fields, with timeout+retry
    const mission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,status,evidence_bundle,metadata')
        .eq('id', missionId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data;
    }, 'get_mission');
    
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found', requestId, duration: Date.now() - startTime },
        { status: 404 }
      );
    }
    
    if (mission.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Already closed', requestId, duration: Date.now() - startTime },
        { status: 400 }
      );
    }
    
    // Build update payload
    const closureEvidence = {
      ...mission.evidence_bundle,
      closure: { closed_at: timestamp, closed_by, closed_by_agent, notes: closure_notes }
    };
    
    // UPDATE mission - with timeout+retry
    const updatedMission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .update({
          status: 'closed',
          phase: 'closure',
          actual_end_date: timestamp,
          progress_percent: 100,
          evidence_bundle: closureEvidence,
          updated_at: timestamp,
          metadata: { ...mission.metadata, changed_by: closed_by, changed_by_agent: closed_by_agent }
        })
        .eq('id', missionId)
        .select('id,status,phase,progress_percent,updated_at')
        .single();
      if (error) throw error;
      return data;
    }, 'update_mission');
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({ level: 'info', endpoint: 'close', requestId, missionId, duration, success: true }));
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('TIMEOUT');
    console.log(JSON.stringify({ level: 'error', endpoint: 'close', requestId, missionId, duration, error: error.message, isTimeout }));
    
    return NextResponse.json(
      { success: false, error: isTimeout ? 'Database timeout' : error.message, requestId, duration },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
