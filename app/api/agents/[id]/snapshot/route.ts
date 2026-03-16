/**
 * ATLAS-RUNTIME-SESSION-SNAPSHOT-DEPLOY-1289
 * POST /api/agents/{id}/snapshot
 * 
 * Capture agent session snapshot endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureAgentSnapshot, buildAndCaptureSnapshot } from '@/lib/agent-session-snapshot';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent_id = params.id;
  
  try {
    const body = await request.json();
    
    // Capture snapshot with provided context
    const snapshot = await buildAndCaptureSnapshot(agent_id, {
      task: body.task,
      workflow_step: body.workflow_step,
      execution_payload: body.execution_payload,
      additional_context: body.additional_context
    });
    
    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      agent_id: snapshot.agent_id,
      task_id: snapshot.task_id,
      execution_id: snapshot.execution_id,
      created_at: snapshot.created_at
    });
    
  } catch (error: any) {
    console.error('[AgentSnapshot API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to capture snapshot'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/{id}/snapshot
 * 
 * Retrieve latest snapshot for an agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent_id = params.id;
  
  try {
    const { getLatestAgentSnapshot } = await import('@/lib/agent-session-snapshot');
    const snapshot = await getLatestAgentSnapshot(agent_id);
    
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'No snapshot found for agent' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        agent_id: snapshot.agent_id,
        task_id: snapshot.task_id,
        execution_id: snapshot.execution_id,
        snapshot_payload: snapshot.snapshot_payload,
        created_at: snapshot.created_at
      }
    });
    
  } catch (error: any) {
    console.error('[AgentSnapshot API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve snapshot'
      },
      { status: 500 }
    );
  }
}
