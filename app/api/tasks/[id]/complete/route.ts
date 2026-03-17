/**
 * ATLAS-OPTIMUS-TASK-EXECUTION-9243
 * POST /api/tasks/:id/complete
 * Mark task complete with result - SIMPLIFIED
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const { id } = params;

  try {
    const body = await request.json();
    const { result_data } = body;

    const supabase = getSupabaseAdmin();

    // Build update
    const updates: any = {
      status: 'completed',
      updated_at: timestamp,
    };

    if (result_data !== undefined) {
      updates.result_data = result_data;
    }

    // Update task
    const { data: updatedTask, error } = await (supabase as any)
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Task Complete] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message, timestamp },
        { status: 500 }
      );
    }

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found', timestamp },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      timestamp,
      source: 'ATLAS-9243'
    });

  } catch (error: any) {
    console.error('[Task Complete] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp, source: 'ATLAS-9243' },
      { status: 500 }
    );
  }
}