/**
 * ATLAS-LEAD-BY-ID API
 * ATLAS-SOPHIA-LEADS-MODULE-START-002
 * 
 * GET/PATCH/DELETE /api/leads/[id]
 * Individual lead operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// Valid lead statuses
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost', 'archived'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

interface RouteParams {
  params: { id: string };
}

// ============================================
// GET /api/leads/[id]
// Get single lead with activities
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Get lead
    const { data: lead, error: leadError } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (leadError || !lead) {
      return NextResponse.json({
        success: false,
        error: `Lead not found: ${id}`,
        timestamp
      }, { status: 404 });
    }
    
    // Get recent activities
    const { data: activities } = await (supabase as any)
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get related deals
    const { data: deals } = await (supabase as any)
      .from('deals')
      .select(`
        *,
        stage:stage_id (name, color)
      `)
      .eq('lead_id', id)
      .order('created_at', { ascending: false });
    
    return NextResponse.json({
      success: true,
      lead,
      activities: activities || [],
      deals: deals || [],
      activity_count: activities?.length || 0,
      deal_count: deals?.length || 0,
      timestamp,
      source: 'leads'
    });
    
  } catch (err: any) {
    console.error('[Lead By ID API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// PATCH /api/leads/[id]
// Update lead fields
// ============================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    // Get current lead for comparison
    const { data: currentLead, error: fetchError } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !currentLead) {
      return NextResponse.json({
        success: false,
        error: `Lead not found: ${id}`,
        timestamp
      }, { status: 404 });
    }
    
    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Validate priority if provided
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({
        success: false,
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Build update object
    const updates: any = {
      updated_at: timestamp
    };
    
    // Allowed fields to update
    const allowedFields = [
      'name', 'email', 'phone', 'company', 'job_title',
      'status', 'priority', 'assigned_to', 'estimated_value',
      'preferred_channel', 'timezone', 'language', 'tags',
      'custom_fields', 'notes', 'consent_status'
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    // Handle assignment
    if (body.assigned_to !== undefined) {
      if (body.assigned_to === null) {
        updates.assigned_to = null;
        updates.assigned_at = null;
      } else {
        updates.assigned_to = body.assigned_to;
        updates.assigned_at = timestamp;
      }
    }
    
    // Update lead
    const { data: updatedLead, error: updateError } = await (supabase as any)
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Lead By ID API] Update error:', updateError);
      return NextResponse.json({
        success: false,
        error: `Update failed: ${updateError.message}`,
        timestamp
      }, { status: 500 });
    }
    
    // Log activity for significant changes
    const activityLog: any = {
      lead_id: id,
      company_id: currentLead.company_id,
      activity_type: 'status_change',
      activity_subtype: 'manual',
      performed_by: body.updated_by || 'system',
      performed_by_type: body.updated_by ? 'agent' : 'system',
      created_at: timestamp
    };
    
    if (body.status && body.status !== currentLead.status) {
      activityLog.subject = 'Status updated';
      activityLog.content = `Status changed from "${currentLead.status}" to "${body.status}"`;
    } else if (body.assigned_to !== undefined && body.assigned_to !== currentLead.assigned_to) {
      activityLog.activity_type = 'assignment';
      activityLog.subject = 'Assignment changed';
      if (body.assigned_to === null) {
        activityLog.content = `Lead unassigned (was assigned to ${currentLead.assigned_to})`;
      } else {
        activityLog.content = `Lead assigned to ${body.assigned_to}`;
      }
    } else {
      activityLog.subject = 'Lead updated';
      activityLog.content = `Lead details updated: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`;
    }
    
    await (supabase as any).from('lead_activities').insert(activityLog);
    
    return NextResponse.json({
      success: true,
      lead: updatedLead,
      changes: Object.keys(updates).filter(k => k !== 'updated_at'),
      timestamp
    });
    
  } catch (err: any) {
    console.error('[Lead By ID API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/leads/[id]
// Archive/delete lead (soft delete via status)
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const { id } = params;
  
  try {
    const { searchParams } = new URL(request.url);
    const hard_delete = searchParams.get('hard_delete') === 'true';
    const deleted_by = searchParams.get('deleted_by') || 'system';
    
    const supabase = getSupabaseAdmin();
    
    // Get lead for logging
    const { data: lead, error: fetchError } = await (supabase as any)
      .from('leads')
      .select('id, name, company_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !lead) {
      return NextResponse.json({
        success: false,
        error: `Lead not found: ${id}`,
        timestamp
      }, { status: 404 });
    }
    
    if (hard_delete) {
      // Actually delete the lead
      const { error: deleteError } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        return NextResponse.json({
          success: false,
          error: `Delete failed: ${deleteError.message}`,
          timestamp
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: `Lead ${id} permanently deleted`,
        timestamp
      });
    } else {
      // Soft delete - mark as archived
      const { error: updateError } = await (supabase as any)
        .from('leads')
        .update({
          status: 'archived',
          updated_at: timestamp
        })
        .eq('id', id);
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: `Archive failed: ${updateError.message}`,
          timestamp
        }, { status: 500 });
      }
      
      // Log activity
      await (supabase as any).from('lead_activities').insert({
        lead_id: id,
        company_id: lead.company_id,
        activity_type: 'status_change',
        activity_subtype: 'manual',
        subject: 'Lead archived',
        content: `Lead archived by ${deleted_by}`,
        performed_by: deleted_by,
        performed_by_type: 'agent',
        created_at: timestamp
      });
      
      return NextResponse.json({
        success: true,
        message: `Lead ${id} archived (soft delete)`,
        lead_id: id,
        timestamp
      });
    }
    
  } catch (err: any) {
    console.error('[Lead By ID API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}
