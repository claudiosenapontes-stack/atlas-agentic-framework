/**
 * POST /api/missions/:id/verify
 * Verify mission completion against success criteria
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id: missionId } = params;
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/verify started`);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      verification_notes,
      verified_by,
      verified_by_agent,
      criteria_results,
      evidence_updates,
    } = body;
    
    const supabase = getSupabaseAdmin();
    
    // Get mission with tasks
    const { data: mission, error: missionError } = await (supabase as any)
      .from('missions')
      .select('*, mission_tasks(*, tasks(*))')
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
    
    // Check if all tasks are completed
    const incompleteTasks = mission.mission_tasks?.filter(
      (mt: any) => mt.tasks?.status !== 'completed'
    ) || [];
    
    // Build verification result
    const verificationResult = {
      verified_at: timestamp,
      verified_by,
      verified_by_agent,
      notes: verification_notes,
      criteria_results: criteria_results || [],
      all_tasks_completed: incompleteTasks.length === 0,
      incomplete_task_count: incompleteTasks.length,
    };
    
    // Update mission evidence bundle with verification
    const updatedEvidence = {
      ...mission.evidence_bundle,
      verification: verificationResult,
      ...(evidence_updates || {}),
    };
    
    // Update mission to verification phase
    const { data: updatedMission, error: updateError } = await (supabase as any)
      .from('missions')
      .update({
        phase: 'verification',
        evidence_bundle: updatedEvidence,
        updated_at: timestamp,
        metadata: {
          ...mission.metadata,
          changed_by: verified_by,
          changed_by_agent: verified_by_agent,
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
    console.log(`[${requestId}] Mission verified in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      verification: verificationResult,
      can_complete: incompleteTasks.length === 0,
      incomplete_tasks: incompleteTasks.map((mt: any) => ({
        id: mt.tasks?.id,
        title: mt.tasks?.title,
        status: mt.tasks?.status,
      })),
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
