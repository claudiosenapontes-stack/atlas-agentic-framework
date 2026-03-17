import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/tasks/{id}
 *
 * Retrieve task details by ID
 *
 * Response 200:
 * {
 *   task: {
 *     id: string,
 *     title: string,
 *     status: string,
 *     owner: string,
 *     due_at: string,
 *     priority: string
 *   }
 * }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;

  try {
    const { data: task, error } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      console.error('[Tasks] Get error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        owner: task.assigned_to || task.owner || null,
        due_at: task.due_date || task.due_at || null,
        priority: task.priority || 'normal'
      }
    });

  } catch (error: any) {
    console.error('[Tasks] Get error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/{id}
 * ATLAS-OPTIMUS-TASK-EXECUTION-9243
 *
 * Update task status and result_data
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const { status, result_data } = body;

    // Build update object
    const updates: any = {
      updated_at: timestamp,
    };

    if (status) {
      updates.status = status;
    }

    if (result_data !== undefined) {
      updates.result_data = result_data;
    }

    // Update task
    const { data: updatedTask, error } = await (supabase as any)
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('[Tasks] Put error:', error);
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
      updated_fields: Object.keys(updates),
      timestamp,
    });

  } catch (error: any) {
    console.error('[Tasks] Put error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', timestamp },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/{id}
 * ATLAS-OPTIMUS-TASK-EXECUTION-9243
 *
 * Partial update for task status and result_data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const { status, result_data } = body;

    // Build update object
    const updates: any = {
      updated_at: timestamp,
    };

    if (status) {
      updates.status = status;
    }

    if (result_data !== undefined) {
      updates.result_data = result_data;
    }

    // Update task
    const { data: updatedTask, error } = await (supabase as any)
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('[Tasks] Patch error:', error);
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
      updated_fields: Object.keys(updates),
      timestamp,
    });

  } catch (error: any) {
    console.error('[Tasks] Patch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', timestamp },
      { status: 500 }
    );
  }
}
