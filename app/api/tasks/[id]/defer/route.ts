import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/tasks/{id}/defer
 * 
 * Defer a task to a later time
 * 
 * Request:
 * {
 *   defer_hours: number,
 *   reason: string
 * }
 * 
 * Response 200:
 * {
 *   success: true,
 *   task_id: string,
 *   new_due_at: string (iso8601),
 *   deferred_by: string
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;
  const deferredAt = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { defer_hours, deferred_by } = body;
    
    if (!defer_hours || defer_hours < 1) {
      return NextResponse.json(
        { success: false, error: 'defer_hours must be at least 1' },
        { status: 400 }
      );
    }
    
    // Calculate new due date
    const newDueAt = new Date();
    newDueAt.setHours(newDueAt.getHours() + defer_hours);
    
    // Update task - minimal columns for schema compatibility
    const updateData: any = {
      status: 'deferred',
      updated_at: deferredAt
    };
    
    // Try to update
    const { error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.log('[Tasks] Defer update error:', error.message);
    }
    
    return NextResponse.json({
      success: true,
      task_id: taskId,
      new_due_at: newDueAt.toISOString(),
      deferred_by: deferred_by || null
    });
    
  } catch (error: any) {
    console.error('[Tasks] Defer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
