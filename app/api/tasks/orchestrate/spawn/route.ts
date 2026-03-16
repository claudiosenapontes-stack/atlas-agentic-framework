/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * POST /api/tasks/orchestrate/spawn
 * Spawn child tasks under a parent
 */

import { NextRequest, NextResponse } from 'next/server';
import { autonomyOrchestrationService } from '@/lib/autonomy-orchestration-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    if (!body.parent_task_id) {
      return NextResponse.json(
        { success: false, error: 'parent_task_id is required', timestamp },
        { status: 422 }
      );
    }

    if (!body.children || !Array.isArray(body.children) || body.children.length === 0) {
      return NextResponse.json(
        { success: false, error: 'children array is required', timestamp },
        { status: 422 }
      );
    }

    const results = [];
    for (const childConfig of body.children) {
      const result = await autonomyOrchestrationService.spawnChildTask(
        body.parent_task_id,
        childConfig
      );
      results.push(result);
    }

    const allSuccess = results.every((r: any) => r.success);
    const statusCode = allSuccess ? 201 : 207;

    return NextResponse.json({
      success: allSuccess,
      parent_task_id: body.parent_task_id,
      spawned: results,
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