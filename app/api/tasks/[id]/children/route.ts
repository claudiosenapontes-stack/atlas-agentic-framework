/**
 * ATLAS-OPTIMUS-AUTONOMY-API
 * GET /api/tasks/:id/children
 * List child tasks with ordering
 */

import { NextRequest, NextResponse } from 'next/server';
import { autonomyOrchestrationService } from '@/lib/autonomy-orchestration-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const { searchParams } = new URL(request.url);
    const orderBy = (searchParams.get('order_by') as any) || 'task_order';
    
    const result = await autonomyOrchestrationService.listChildren(id, orderBy);

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