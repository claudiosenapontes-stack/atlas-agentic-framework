import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/approvals
// List pending approvals

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const companyId = searchParams.get('companyId');
    
    let query = supabase
      .from('approvals')
      .select(`
        *,
        command:commands(id, command_type, command_text, risk_level, estimated_cost_usd)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Approvals API] Failed to fetch:', error);
      return NextResponse.json(
        { error: 'Failed to fetch approvals' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      approvals: data || [],
      count: data?.length || 0,
    });
    
  } catch (error) {
    console.error('[Approvals API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/approvals
// Approve or reject a pending approval

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.approvalId || !body.action || !body.approvedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: approvalId, action, approvedBy' },
        { status: 400 }
      );
    }
    
    if (!['approved', 'rejected'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Action must be "approved" or "rejected"' },
        { status: 400 }
      );
    }
    
    // Get the approval record
    const { data: approval, error: fetchError } = await supabase
      .from('approvals')
      .select('*, command:commands(*)')
      .eq('id', body.approvalId)
      .single();
      
    if (fetchError || !approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }
    
    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval already ${approval.status}` },
        { status: 400 }
      );
    }
    
    // Update approval status
    const { error: updateError } = await supabase
      .from('approvals')
      .update({
        status: body.action,
        approved_by: body.approvedBy,
        approved_at: new Date().toISOString(),
        rejection_reason: body.action === 'rejected' ? body.reason : null,
      })
      .eq('id', body.approvalId);
      
    if (updateError) {
      console.error('[Approvals API] Failed to update:', updateError);
      return NextResponse.json(
        { error: 'Failed to update approval' },
        { status: 500 }
      );
    }
    
    // Update associated command
    const commandStatus = body.action === 'approved' ? 'approved' : 'rejected';
    await supabase
      .from('commands')
      .update({
        status: commandStatus,
        approved_by: body.approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', approval.command_id);
    
    // Emit event
    await supabase.from('events').insert({
      company_id: approval.company_id,
      event_type: body.action === 'approved' ? 'approval.approved' : 'approval.rejected',
      actor_type: 'user',
      actor_id: body.approvedBy,
      target_type: 'approval',
      target_id: body.approvalId,
      payload: {
        command_id: approval.command_id,
        reason: body.reason,
      },
    });
    
    // If approved, queue for execution
    if (body.action === 'approved') {
      // Trigger command execution (this would typically be done via a background job)
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/commands/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId: approval.command_id }),
      }).catch(err => console.error('[Approvals] Failed to trigger execution:', err));
    }
    
    return NextResponse.json({
      success: true,
      approvalId: body.approvalId,
      status: body.action,
      message: body.action === 'approved' 
        ? 'Approved and queued for execution'
        : 'Rejected',
    });
    
  } catch (error) {
    console.error('[Approvals API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
