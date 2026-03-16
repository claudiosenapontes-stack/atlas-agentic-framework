/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * POST /api/tasks/:id/aggregate
 * Aggregate child task results
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
    const result = await autonomyOrchestrationService.aggregateChildResults(id);

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