/**
 * POST /api/missions/:id/reopen - ULTRA-HARDENED
 * ATLAS-OPTIMUS-MISSION-ACTION-ENDPOINTS-CLOSEOUT-1213
 * - Aggressive 2s timeout on ALL DB operations
 * - Minimal field selection
 * - Streamlined logic
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
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('BODY_TIMEOUT')), 500))
    ]) as any;
    
    const { reopen_reason, reopened_by, reopened_by_agent, new_phase = 'execution' } = body;
    
    if (!reopen_reason) {
      return NextResponse.json(
        { success: false, error: 'reopen_reason required', requestId },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // GET mission - minimal fields
    const mission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,status,phase,evidence_bundle,metadata')
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
    
    if (mission.status !== 'closed' && mission.status !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Cannot reopen ${mission.status} mission`, requestId, duration: Date.now() - startTime },
        { status: 400 }
      );
    }
    
    const reopenEvidence = {
      ...mission.evidence_bundle,
      reopen: { reopened_at: timestamp, reopened_by, reopened_by_agent, reason: reopen_reason, previous_status: mission.status, previous_phase: mission.phase }
    };
    
    // UPDATE mission
    const updatedMission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .update({
          status: 'active',
          phase: new_phase,
          actual_end_date: null,
          evidence_bundle: reopenEvidence,
          updated_at: timestamp,
          metadata: { ...mission.metadata, changed_by: reopened_by, changed_by_agent: reopened_by_agent }
        })
        .eq('id', missionId)
        .select('id,status,phase,updated_at')
        .single();
      if (error) throw error;
      return data;
    }, 'update_mission');
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({ level: 'info', endpoint: 'reopen', requestId, missionId, duration, success: true }));
    
    return NextResponse.json({ success: true, mission: updatedMission, requestId, duration });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('TIMEOUT');
    console.log(JSON.stringify({ level: 'error', endpoint: 'reopen', requestId, missionId, duration, error: error.message, isTimeout }));
    
    return NextResponse.json(
      { success: false, error: isTimeout ? 'Database timeout' : error.message, requestId, duration },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
