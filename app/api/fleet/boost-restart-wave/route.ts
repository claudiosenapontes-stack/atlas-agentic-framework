/**
 * ATLAS-OPTIMUS-BOOST-RESTART-API
 * POST /api/fleet/boost-restart-wave
 * 
 * Wave restart multiple agents in batches
 */

import { NextRequest, NextResponse } from 'next/server';
import { boostRestartService } from '@/lib/boost-restart-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    if (!body.agent_ids || !Array.isArray(body.agent_ids) || body.agent_ids.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: agent_ids (array)',
          timestamp,
          source: 'boost_restart_api'
        },
        { status: 422 }
      );
    }

    console.log(`[BoostRestart API] Initiating wave restart for ${body.agent_ids.length} agents: ${body.agent_ids.join(', ')}`);

    const result = await boostRestartService.restartWave(body.agent_ids, {
      waitForHeartbeatMs: body.waitForHeartbeatMs || 30000,
      waitForLockMs: body.waitForLockMs || 15000,
      snapshotBeforeRestart: body.snapshotBeforeRestart !== false,
      verifyHeartbeat: body.verifyHeartbeat !== false,
      reacquireLock: body.reacquireLock !== false,
      initiated_by: body.initiated_by || 'api',
      reason: body.reason || 'Wave boost restart via API'
    });

    const allSuccess = result.summary.success === result.summary.total;
    const statusCode = allSuccess ? 200 : result.summary.success > 0 ? 207 : 500;

    return NextResponse.json({
      success: allSuccess,
      results: result.results,
      summary: result.summary,
      timestamp,
      source: 'boost_restart_api'
    }, { status: statusCode });

  } catch (error: any) {
    console.error('[BoostRestart API] Wave restart error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        results: [],
        summary: { total: 0, success: 0, failed: 0 },
        timestamp,
        source: 'boost_restart_api'
      },
      { status: 500 }
    );
  }
}