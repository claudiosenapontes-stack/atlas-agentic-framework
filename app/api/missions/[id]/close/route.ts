/**
 * POST /api/missions/:id/close
 * Close a mission (mark as completed)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id: missionId } = params;
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/close started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      closure_notes,
      closed_by,
      closed_by_agent,
      final_outcome,
      lessons_learned,
      evidence_updates,
    } = body;
    
    const supabase = getSupabaseAdmin();
    
    // Get mission
    const { data: mission, error: missionError } = await (supabase as any)
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (missionError || !mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        timestamp,
        requestId,
      }, { status: 404 });
    }
    
    // Check current status
    if (mission.status === 'closed') {
      return NextResponse.json({
        success: false,
        error: 'Mission is already closed',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    // Build closure evidence
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
    
    // Update mission to closed
    const { data: updatedMission, error: updateError } = await (supabase as any)
      .from('missions')
      .update({
        status: 'closed',
        phase: 'closure',
        actual_end_date: timestamp,
        progress_percent: 100,
        evidence_bundle: closureEvidence,
        updated_at: timestamp,
        metadata: {
          ...mission.metadata,
          changed_by: closed_by,
          changed_by_agent: closed_by_agent,
        }
      })
      .eq('id', missionId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Mission closed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      closure: closureEvidence.closure,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] POST exception after ${duration}ms:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
    }, { status: 500 });
  }
}
