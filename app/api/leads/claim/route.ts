/**
 * ATLAS-LEADS-CLAIM API
 * ATLAS-SOPHIA-LEADS-MODULE-START-002
 * 
 * POST /api/leads/claim
 * Agent claims an unassigned lead
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// Valid agents
const VALID_AGENTS = ['henry', 'severino', 'olivia', 'sophia', 'harvey', 'einstein', 'optimus', 'optimus-prime', 'claudio'];

// ============================================
// POST /api/leads/claim
// Claim an unassigned lead
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
    
    if (!body.agent_id) {
      return NextResponse.json({
        success: false,
        error: 'agent_id is required',
        timestamp
      }, { status: 400 });
    }
    
    if (!VALID_AGENTS.includes(body.agent_id)) {
      return NextResponse.json({
        success: false,
        error: `Invalid agent_id. Must be one of: ${VALID_AGENTS.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get lead and lock it for update
    const { data: lead, error: fetchError } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', body.lead_id)
      .single();
    
    if (fetchError || !lead) {
      return NextResponse.json({
        success: false,
        error: `Lead not found: ${body.lead_id}`,
        timestamp
      }, { status: 404 });
    }
    
    // Check if already assigned
    if (lead.assigned_to && lead.assigned_to !== body.agent_id) {
      return NextResponse.json({
        success: false,
        error: `Lead already assigned to ${lead.assigned_to}`,
        current_assignment: lead.assigned_to,
        assigned_at: lead.assigned_at,
        timestamp
      }, { status: 409 });
    }
    
    // Check if this agent already claimed it
    if (lead.assigned_to === body.agent_id) {
      return NextResponse.json({
        success: true,
        message: 'Lead already assigned to you',
        lead,
        timestamp
      });
    }
    
    // Claim the lead
    const { data: updatedLead, error: updateError } = await (supabase as any)
      .from('leads')
      .update({
        assigned_to: body.agent_id,
        assigned_at: timestamp,
        status: lead.status === 'new' ? 'contacted' : lead.status,
        first_contact_at: lead.first_contact_at || timestamp,
        last_contact_at: timestamp,
        updated_at: timestamp
      })
      .eq('id', body.lead_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Leads Claim API] Update error:', updateError);
      return NextResponse.json({
        success: false,
        error: `Claim failed: ${updateError.message}`,
        timestamp
      }, { status: 500 });
    }
    
    // Log the claim activity
    await (supabase as any).from('lead_activities').insert({
      lead_id: body.lead_id,
      company_id: lead.company_id,
      activity_type: 'assignment',
      activity_subtype: 'manual',
      subject: 'Lead claimed',
      content: `Lead claimed by ${body.agent_id}`,
      performed_by: body.agent_id,
      performed_by_type: 'agent',
      created_at: timestamp
    });
    
    return NextResponse.json({
      success: true,
      message: `Lead claimed by ${body.agent_id}`,
      lead: updatedLead,
      timestamp
    });
    
  } catch (err: any) {
    console.error('[Leads Claim API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// GET /api/leads/claim
// List available (unassigned) leads
// ============================================
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Filters
    const min_score = searchParams.get('min_score');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const supabase = getSupabaseAdmin();
    
    // Get unassigned leads
    let query = (supabase as any)
      .from('leads')
      .select('*', { count: 'exact' })
      .is('assigned_to', null)
      .in('status', ['new', 'contacted'])
      .order('score', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (min_score) {
      query = query.gte('score', parseInt(min_score));
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    if (source) {
      query = query.eq('source', source);
    }
    
    const { data: leads, error, count } = await query.limit(limit);
    
    if (error) {
      console.error('[Leads Claim API] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
        code: error.code,
        timestamp
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      leads: leads || [],
      count: leads?.length || 0,
      total_available: count || 0,
      filters: {
        min_score,
        priority,
        source,
        limit
      },
      timestamp,
      source: 'leads'
    });
    
  } catch (err: any) {
    console.error('[Leads Claim API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}
