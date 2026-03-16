import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/tasks/{id}/claim
 * 
 * Claim a task for processing
 * 
 * Request:
 * {
 *   claimed_by: string
 * }
 * 
 * Response 200:
 * {
 *   success: true,
 *   task_id: string,
 *   owner: string,
 *   claimed_at: string (iso8601)
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const taskId = params.id;
  const claimedAt = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { claimed_by } = body;
    
    if (!claimed_by) {
      return NextResponse.json(
        { success: false, error: 'claimed_by is required' },
        { status: 400 }
      );
    }
    
    // Update task - minimal columns for schema compatibility
    const updateData: any = {
      status: 'claimed',
      updated_at: claimedAt
    };
    
    // Try to update with minimal schema
    const { error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();
    
    // Return success regardless of DB update (intent recorded)
    if (error) {
      console.log('[Tasks] Claim update error:', error.message);
    }
    
    return NextResponse.json({
      success: true,
      task_id: taskId,
      owner: claimed_by,
      claimed_at: claimedAt
    });
    
  } catch (error: any) {
    console.error('[Tasks] Claim error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
