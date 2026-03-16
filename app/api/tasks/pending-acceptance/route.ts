/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * GET /api/tasks/pending-acceptance
 * Get tasks pending acceptance for an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { autonomyOrchestrationService } from '@/lib/autonomy-orchestration-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agent_id query parameter is required', timestamp },
        { status: 422 }
      );
    }

    const result = await autonomyOrchestrationService.getPendingAcceptances(agentId);

    const statusCode = result.success ? 200 : 500;

    return NextResponse.json({
      ...result,
      timestamp,
      source: 'autonomy_api'
    }, { status: statusCode });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, timestamp, source: 'autonomy_api' },
      { status: 500 }
    );
  }
}