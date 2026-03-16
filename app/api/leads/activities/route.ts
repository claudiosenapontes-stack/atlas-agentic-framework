/**
 * ATLAS-LEADS-ACTIVITIES API
 * ATLAS-SOPHIA-LEADS-MODULE-START-002
 * 
 * GET/POST /api/leads/activities
 * Lead activity logging and retrieval
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid activity types
const VALID_ACTIVITY_TYPES = ['note', 'email', 'call', 'meeting', 'sms', 'whatsapp', 'telegram', 'status_change', 'score_change', 'assignment', 'deal_created', 'task_created', 'imported', 'webhook'];
const VALID_SUBTYPES = ['inbound', 'outbound', 'automated', 'manual'];
const VALID_OUTCOMES = ['completed', 'no_answer', 'voicemail', 'scheduled', 'interested', 'not_interested', 'callback_requested', 'follow_up_needed', 'qualified', 'unqualified'];
const VALID_PERFORMER_TYPES = ['agent', 'system', 'integration', 'lead'];

// ============================================
// GET /api/leads/activities
// List activities for a lead or all recent activities
// ============================================
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Filters
    const lead_id = searchParams.get('lead_id');
    const company_id = searchParams.get('company_id');
    const activity_type = searchParams.get('activity_type');
    const performed_by = searchParams.get('performed_by');
    const deal_id = searchParams.get('deal_id');
    const campaign_id = searchParams.get('campaign_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    // Build query
    let query = (supabase as any)
      .from('lead_activities')
      .select(`
        *,
        leads:lead_id (name, email, company)
      `, { count: 'exact' });
    
    // Apply filters
    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }
    
    if (performed_by) {
      query = query.eq('performed_by', performed_by);
    }
    
    if (deal_id) {
      query = query.eq('deal_id', deal_id);
    }
    
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    
    if (to_date) {
      query = query.lte('created_at', to_date);
    }
    
    // Execute query with pagination
    const { data: activities, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Leads Activities API] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
        code: error.code,
        timestamp
      }, { status: 500 });
    }
    
    // Get activity type breakdown from fetched data (avoid .group())
    let typeStats: Record<string, number> = {};
    if (!lead_id && activities) {
      activities.forEach((activity: any) => {
        const type = activity.activity_type || 'unknown';
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
    }
    
    return NextResponse.json({
      success: true,
      activities: activities || [],
      count: activities?.length || 0,
      total: count || 0,
      stats: {
        total: count || 0,
        by_type: typeStats
      },
      filters: {
        lead_id,
        company_id,
        activity_type,
        performed_by,
        deal_id,
        campaign_id,
        from_date,
        to_date,
        limit,
        offset
      },
      timestamp,
      source: 'lead_activities'
    });
    
  } catch (err: any) {
    console.error('[Leads Activities API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// POST /api/leads/activities
// Log a new activity for a lead
// ============================================
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    // Validation
    if (!body.lead_id) {
      return NextResponse.json({
        success: false,
        error: 'lead_id is required',
        timestamp
      }, { status: 400 });
    }
    
    if (!body.activity_type || !VALID_ACTIVITY_TYPES.includes(body.activity_type)) {
      return NextResponse.json({
        success: false,
        error: `activity_type is required. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Validate subtype if provided
    if (body.activity_subtype && !VALID_SUBTYPES.includes(body.activity_subtype)) {
      return NextResponse.json({
        success: false,
        error: `Invalid activity_subtype. Must be one of: ${VALID_SUBTYPES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Validate outcome if provided
    if (body.outcome && !VALID_OUTCOMES.includes(body.outcome)) {
      return NextResponse.json({
        success: false,
        error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Validate performer type if provided
    if (body.performed_by_type && !VALID_PERFORMER_TYPES.includes(body.performed_by_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid performed_by_type. Must be one of: ${VALID_PERFORMER_TYPES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Verify lead exists
    const { data: lead, error: leadError } = await (supabase as any)
      .from('leads')
      .select('id, company_id, status, contact_attempts')
      .eq('id', body.lead_id)
      .single();
    
    if (leadError || !lead) {
      return NextResponse.json({
        success: false,
        error: `Lead not found: ${body.lead_id}`,
        timestamp
      }, { status: 404 });
    }
    
    // Prepare activity record
    const activityId = randomUUID();
    const activityRecord = {
      id: activityId,
      lead_id: body.lead_id,
      company_id: body.company_id || lead.company_id,
      activity_type: body.activity_type,
      activity_subtype: body.activity_subtype || 'manual',
      subject: body.subject || null,
      content: body.content || null,
      summary: body.summary || null,
      outcome: body.outcome || null,
      next_action: body.next_action || null,
      next_action_date: body.next_action_date || null,
      duration_seconds: body.duration_seconds || null,
      recording_url: body.recording_url || null,
      attachments: body.attachments || [],
      performed_by: body.performed_by || 'system',
      performed_by_type: body.performed_by_type || 'agent',
      deal_id: body.deal_id || null,
      task_id: body.task_id || null,
      campaign_id: body.campaign_id || null,
      opened: body.opened || null,
      clicked: body.clicked || null,
      replied: body.replied || null,
      created_at: timestamp
    };
    
    // Insert activity
    const { data: insertedActivity, error: insertError } = await (supabase as any)
      .from('lead_activities')
      .insert(activityRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('[Leads Activities API] Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${insertError.message}`,
        code: insertError.code,
        timestamp
      }, { status: 500 });
    }
    
    // Update lead's last_activity_at and other relevant fields
    const leadUpdates: any = {
      last_activity_at: timestamp
    };
    
    // Update contact_attempts for certain activity types
    if (['call', 'email', 'sms', 'whatsapp', 'telegram'].includes(body.activity_type)) {
      leadUpdates.contact_attempts = (lead.contact_attempts || 0) + 1;
    }
    
    // Update status for certain outcomes
    if (body.outcome === 'qualified') {
      leadUpdates.status = 'qualified';
    } else if (body.activity_type === 'call' || body.activity_type === 'email') {
      if (lead.status === 'new') {
        leadUpdates.status = 'contacted';
        leadUpdates.first_contact_at = timestamp;
      }
      leadUpdates.last_contact_at = timestamp;
    }
    
    // Apply lead updates
    const { error: updateError } = await (supabase as any)
      .from('leads')
      .update(leadUpdates)
      .eq('id', body.lead_id);
    
    if (updateError) {
      console.error('[Leads Activities API] Lead update error:', updateError);
      // Don't fail the request if lead update fails
    }
    
    return NextResponse.json({
      success: true,
      id: activityId,
      status: 'created',
      activity: insertedActivity,
      lead_updates: Object.keys(leadUpdates),
      timestamp
    }, { status: 201 });
    
  } catch (err: any) {
    console.error('[Leads Activities API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}
