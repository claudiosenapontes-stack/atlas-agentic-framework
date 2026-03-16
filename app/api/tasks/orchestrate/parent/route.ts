/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * POST /api/tasks/orchestrate/parent
 * Create a parent task for orchestration
 */

import { NextRequest, NextResponse } from 'next/server';
import { autonomyOrchestrationService } from '@/lib/autonomy-orchestration-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'title is required', timestamp },
        { status: 422 }
      );
    }

    const result = await autonomyOrchestrationService.createParentTask(
      body.title,
      body.description || '',
      {
        orchestrationId: body.orchestration_id,
        expectedChildren: body.expected_children,
        autoAggregate: body.auto_aggregate,
        initiatedBy: body.initiated_by
      }
    );

    const statusCode = result.success ? 201 : 500;

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