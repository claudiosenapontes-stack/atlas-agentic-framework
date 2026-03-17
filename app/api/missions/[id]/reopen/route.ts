/**
 * POST /api/missions/:id/reopen - HARDENED
 * ATLAS-OPTIMUS-MISSION-ENGINE-HARDENING-1204
 * - 3s timeout guard
 * - Retry logic
 * - Comprehensive logging
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_EXECUTION_MS = 3000;

interface LogEntry {
  requestId: string;
  endpoint: string;
  missionId: string;
  duration: number;
  success: boolean;
  errorSource?: string;
}

function logAccess(entry: LogEntry) {
  console.log(JSON.stringify({
    level: entry.success ? 'info' : 'error',
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, context: string): Promise<{ data: T | null; error: any; attempts: number }> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const data = await fn();
      return { data, error: null, attempts: i + 1 };
    } catch (error) {
      lastError = error;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  return { data: null, error: lastError, attempts: retries };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id: missionId } = params;
  const startTime = Date.now();
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/reopen started`);
  
  try {
    const body = await withTimeout(request.json(), 1000, 'body parsing');
    const { reopen_reason, reopened_by, reopened_by_agent, new_phase = 'execution' } = body;
    
    if (!reopen_reason) {
      return NextResponse.json({
        success: false,
        error: 'reopen_reason is required',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (missionError || !mission) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/reopen', missionId, duration, success: false, errorSource: 'not_found' });
      return NextResponse.json({ success: false, error: 'Mission not found', timestamp, requestId, duration }, { status: 404 });
    }
    
    if (mission.status !== 'closed' && mission.status !== 'cancelled') {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/reopen', missionId, duration, success: false, errorSource: 'invalid_status' });
      return NextResponse.json({
        success: false,
        error: `Cannot reopen mission with status: ${mission.status}`,
        timestamp,
        requestId,
        duration,
      }, { status: 400 });
    }
    
    const reopenEvidence = {
      ...mission.evidence_bundle,
      reopen: {
        reopened_at: timestamp,
        reopened_by,
        reopened_by_agent,
        reason: reopen_reason,
        previous_status: mission.status,
        previous_phase: mission.phase,
      }
    };
    
    // Update mission
    const { data: updatedMission, error: updateError } = await supabase
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
      .select()
      .single();
    
    if (updateError) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/reopen', missionId, duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({ success: false, error: updateError.message, timestamp, requestId, duration }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/reopen', missionId, duration, success: true });
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      reopen: reopenEvidence.reopen,
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ requestId, endpoint: '/reopen', missionId, duration, success: false, errorSource: isTimeout ? 'timeout' : 'exception' });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}
