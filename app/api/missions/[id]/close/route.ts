/**
 * POST /api/missions/:id/close - HARDENED
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
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/close started`);
  
  try {
    const body = await withTimeout(request.json(), 1000, 'body parsing');
    const { closure_notes, closed_by, closed_by_agent, final_outcome, lessons_learned, evidence_updates } = body;
    
    const supabase = getSupabaseAdmin();
    
    // Get mission
    const missionResult = await withTimeout(
      supabase.from('missions').select('*').eq('id', missionId).is('deleted_at', null).single(),
      MAX_EXECUTION_MS,
      'Supabase GET mission'
    ) as { data: any; error: any };
    const { data: mission, error: missionError } = missionResult;
    
    if (missionError || !mission) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/close', missionId, duration, success: false, errorSource: 'not_found' });
      return NextResponse.json({ success: false, error: 'Mission not found', timestamp, requestId, duration }, { status: 404 });
    }
    
    if (mission.status === 'closed') {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/close', missionId, duration, success: false, errorSource: 'already_closed' });
      return NextResponse.json({ success: false, error: 'Mission is already closed', timestamp, requestId, duration }, { status: 400 });
    }
    
    const closureEvidence = {
      ...mission.evidence_bundle,
      closure: {
        closed_at: timestamp,
        closed_by,
        closed_by_agent,
        notes: closure_notes,
        final_outcome: final_outcome || 'completed',
        lessons_learned: lessons_learned || [],
      },
      ...(evidence_updates || {}),
    };
    
    // Update mission with retry
    const { data: updatedMission, error: updateError } = await withTimeout(
      withRetry(() => 
        supabase.from('missions').update({
          status: 'closed',
          phase: 'closure',
          actual_end_date: timestamp,
          progress_percent: 100,
          evidence_bundle: closureEvidence,
          updated_at: timestamp,
          metadata: { ...mission.metadata, changed_by: closed_by, changed_by_agent: closed_by_agent }
        }).eq('id', missionId).select().single(),
        2,
        'UPDATE mission close'
      ).then(r => {
        if (r.error) throw r.error;
        return { data: r.data, error: null };
      }),
      MAX_EXECUTION_MS,
      'Supabase UPDATE close'
    );
    
    if (updateError) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/close', missionId, duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({ success: false, error: updateError.message, timestamp, requestId, duration }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/close', missionId, duration, success: true });
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      closure: closureEvidence.closure,
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ requestId, endpoint: '/close', missionId, duration, success: false, errorSource: isTimeout ? 'timeout' : 'exception' });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}
