/**
 * POST /api/missions/:id/reopen
 * Reopen a closed or cancelled mission
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
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/reopen started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      reopen_reason,
      reopened_by,
      reopened_by_agent,
      new_phase = 'execution',
    } = body;
    
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
    if (mission.status !== 'closed' && mission.status !== 'cancelled') {
      return NextResponse.json({
        success: false,
        error: `Cannot reopen mission with status: ${mission.status}`,
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    // Update evidence bundle with reopen info
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
    
    // Update mission to active
    const { data: updatedMission, error: updateError } = await (supabase as any)
      .from('missions')
      .update({
        status: 'active',
        phase: new_phase,
        actual_end_date: null, // Clear end date
        evidence_bundle: reopenEvidence,
        updated_at: timestamp,
        metadata: {
          ...mission.metadata,
          changed_by: reopened_by,
          changed_by_agent: reopened_by_agent,
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
    console.log(`[${requestId}] Mission reopened in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      reopen: reopenEvidence.reopen,
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
