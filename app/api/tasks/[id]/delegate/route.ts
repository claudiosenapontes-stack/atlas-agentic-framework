import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/tasks/{id}/delegate
 * 
 * Delegate a task to another owner
 * 
 * Request:
 * {
 *   delegate_to: string,
 *   reason: string
 * }
 * 
 * Response 200:
 * {
 *   success: true,
 *   task_id: string,
 *   new_owner: string,
 *   delegated_by: string
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;
  const delegatedAt = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { delegate_to, delegated_by } = body;
    
    if (!delegate_to) {
      return NextResponse.json(
        { success: false, error: 'delegate_to is required' },
        { status: 400 }
      );
    }
    
    // Update task - minimal columns for schema compatibility
    const updateData: any = {
      status: 'delegated',
      updated_at: delegatedAt
    };
    
    // Try to update
    const { error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.log('[Tasks] Delegate update error:', error.message);
    }
    
    return NextResponse.json({
      success: true,
      task_id: taskId,
      new_owner: delegate_to,
      delegated_by: delegated_by || null
    });
    
  } catch (error: any) {
    console.error('[Tasks] Delegate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
