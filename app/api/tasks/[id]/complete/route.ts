/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * POST /api/tasks/:id/complete
 * Mark child task complete with result
 */

import { NextRequest, NextResponse } from 'next/server';
import { autonomyOrchestrationService } from '@/lib/autonomy-orchestration-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const body = await request.json();
    
    if (!body.agent_id) {
      return NextResponse.json(
        { success: false, error: 'agent_id is required', timestamp },
        { status: 422 }
      );
    }

    if (!body.result_data) {
      return NextResponse.json(
        { success: false, error: 'result_data is required', timestamp },
        { status: 422 }
      );
    }

    const result = await autonomyOrchestrationService.markChildComplete(
      id,
      body.agent_id,
      {
        resultType: body.result_type || 'output',
        resultData: body.result_data,
        resultSummary: body.result_summary,
        tokensUsed: body.tokens_used,
        executionTimeMs: body.execution_time_ms
      }
    );

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