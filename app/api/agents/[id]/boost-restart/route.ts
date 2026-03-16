/**
 * ATLAS-OPTIMUS-BOOST-RESTART-API
 * POST /api/agents/:id/boost-restart
 * 
 * Single agent boost restart with full verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { boostRestartService } from '@/lib/boost-restart-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const body = await request.json();
    
    console.log(`[BoostRestart API] Initiating boost restart for agent: ${id}`);

    const result = await boostRestartService.restartAgent(id, {
      waitForHeartbeatMs: body.waitForHeartbeatMs || 30000,
      waitForLockMs: body.waitForLockMs || 15000,
      snapshotBeforeRestart: body.snapshotBeforeRestart !== false,
      verifyHeartbeat: body.verifyHeartbeat !== false,
      reacquireLock: body.reacquireLock !== false,
      initiated_by: body.initiated_by || 'api',
      reason: body.reason || 'Context window boost restart via API'
    });

    const statusCode = result.success ? 200 : result.rollback_applied ? 500 : 502;

    return NextResponse.json({
      success: result.success,
      agent_id: result.agent_id,
      pre_session_id: result.pre_session_id,
      post_session_id: result.post_session_id,
      pre_context_size: result.pre_context_size,
      post_context_size: result.post_context_size,
      heartbeat_verified: result.heartbeat_verified,
      lock_reacquired: result.lock_reacquired,
      rollback_applied: result.rollback_applied,
      error: result.error,
      details: result.details,
      timestamp,
      source: 'boost_restart_api'
    }, { status: statusCode });

  } catch (error: any) {
    console.error(`[BoostRestart API] Error restarting agent ${id}:`, error);
    return NextResponse.json(
      { 
        success: false,
        agent_id: id,
        pre_session_id: '',
        post_session_id: '',
        pre_context_size: 0,
        post_context_size: 0,
        heartbeat_verified: false,
        lock_reacquired: false,
        rollback_applied: false,
        error: error.message,
        timestamp,
        source: 'boost_restart_api'
      },
      { status: 500 }
    );
  }
}