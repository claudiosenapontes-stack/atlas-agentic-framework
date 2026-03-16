/**
 * ATLAS-OPTIMUS-BOOST-RESTART-API
 * POST /api/fleet/boost-restart-all-stuck
 * 
 * Auto-detect and restart all stuck agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { boostRestartService } from '@/lib/boost-restart-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    console.log('[BoostRestart API] Initiating auto-detect and restart of all stuck agents');

    // First, get stuck agents for reporting
    const stuckAgents = await boostRestartService.getStuckAgents(
      body.contextThreshold || 0.8,
      body.heartbeatStaleMinutes || 10
    );

    if (stuckAgents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck agents detected',
        stuck_agents: [],
        results: [],
        summary: { total: 0, success: 0, failed: 0 },
        timestamp,
        source: 'boost_restart_api'
      });
    }

    console.log(`[BoostRestart API] Detected ${stuckAgents.length} stuck agents:`);
    stuckAgents.forEach(a => console.log(`  - ${a.agent_id}: ${a.reason} (${a.severity})`));

    const result = await boostRestartService.restartAllStuck({
      autoDetect: true,
      waitForHeartbeatMs: body.waitForHeartbeatMs || 30000,
      waitForLockMs: body.waitForLockMs || 15000,
      snapshotBeforeRestart: body.snapshotBeforeRestart !== false,
      verifyHeartbeat: body.verifyHeartbeat !== false,
      reacquireLock: body.reacquireLock !== false,
      initiated_by: body.initiated_by || 'api',
      reason: body.reason || 'Auto-detected stuck agents restart'
    });

    const allSuccess = result.summary.success === result.summary.total;
    const statusCode = allSuccess ? 200 : result.summary.success > 0 ? 207 : 500;

    return NextResponse.json({
      success: allSuccess,
      stuck_agents_detected: stuckAgents.map(a => ({
        agent_id: a.agent_id,
        reason: a.reason,
        severity: a.severity
      })),
      stuck_agents_restarted: result.stuckAgents,
      results: result.results,
      summary: result.summary,
      timestamp,
      source: 'boost_restart_api'
    }, { status: statusCode });

  } catch (error: any) {
    console.error('[BoostRestart API] Restart all stuck error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stuck_agents_detected: [],
        stuck_agents_restarted: [],
        results: [],
        summary: { total: 0, success: 0, failed: 0 },
        timestamp,
        source: 'boost_restart_api'
      },
      { status: 500 }
    );
  }
}