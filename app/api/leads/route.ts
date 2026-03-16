/**
 * ATLAS-LEADS API
 * ATLAS-SOPHIA-LEADS-MODULE-START-002
 * 
 * GET/POST /api/leads
 * Lead capture, scoring, and management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid lead statuses
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost', 'archived'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_SOURCES = ['website', 'manychat', 'campaign', 'manual', 'import', 'referral', 'linkedin', 'event', 'other'];
const VALID_CHANNELS = ['email', 'phone', 'whatsapp', 'telegram', 'sms'];

// ============================================
// GET /api/leads
// List leads with filtering
// ============================================
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Filters
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigned_to = searchParams.get('assigned_to');
    const campaign_id = searchParams.get('campaign_id');
    const source = searchParams.get('source');
    const min_score = searchParams.get('min_score');
    const max_score = searchParams.get('max_score');
    const hot_only = searchParams.get('hot_only') === 'true';
    const unassigned_only = searchParams.get('unassigned_only') === 'true';
    const search = searchParams.get('search');
    const company_id = searchParams.get('company_id');
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    // Build query
    let query = (supabase as any)
      .from('leads')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    
    if (source) {
      query = query.eq('source', source);
    }
    
    if (min_score) {
      query = query.gte('score', parseInt(min_score));
    }
    
    if (max_score) {
      query = query.lte('score', parseInt(max_score));
    }
    
    if (hot_only) {
      query = query.gte('score', 80).eq('status', 'new');
    }
    
    if (unassigned_only) {
      query = query.is('assigned_to', null);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }
    
    // Execute query with pagination
    const { data: leads, error, count } = await query
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Leads API] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
        code: error.code,
        timestamp
      }, { status: 500 });
    }
    
    // Calculate stats
    const stats = {
      total: count || 0,
      by_status: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
      hot_count: 0,
      unassigned_count: 0,
      total_estimated_value: 0
    };
    
    // Get aggregate stats
    const { data: statusCounts } = await (supabase as any)
      .from('leads')
      .select('status', { count: 'exact' })
      .group('status');
    
    if (statusCounts) {
      statusCounts.forEach((row: any) => {
        stats.by_status[row.status] = parseInt(row.count);
      });
    }
    
    // Get hot leads count
    const { count: hotCount } = await (supabase as any)
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('score', 80)
      .eq('status', 'new');
    
    stats.hot_count = hotCount || 0;
    
    return NextResponse.json({
      success: true,
      leads: leads || [],
      count: leads?.length || 0,
      total: count || 0,
      stats,
      filters: {
        status,
        priority,
        assigned_to,
        campaign_id,
        source,
        min_score,
        max_score,
        hot_only,
        unassigned_only,
        search,
        company_id,
        limit,
        offset
      },
      timestamp,
      source: 'leads'
    });
    
  } catch (err: any) {
    console.error('[Leads API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// POST /api/leads
// Create new lead with auto-scoring
// ============================================
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'name is required and must be a non-empty string',
        timestamp
      }, { status: 400 });
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
    
    // Validate source if provided
    if (body.source && !VALID_SOURCES.includes(body.source)) {
      return NextResponse.json({
        success: false,
        error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    // Validate channel if provided
    if (body.preferred_channel && !VALID_CHANNELS.includes(body.preferred_channel)) {
      return NextResponse.json({
        success: false,
        error: `Invalid preferred_channel. Must be one of: ${VALID_CHANNELS.join(', ')}`,
        timestamp
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Calculate lead score using database function
    const { data: scoreResult, error: scoreError } = await (supabase as any)
      .rpc('calculate_lead_score', {
        p_source: body.source || 'manual',
        p_name: body.name,
        p_email: body.email || '',
        p_notes: body.notes || '',
        p_custom_fields: body.custom_fields || {}
      });
    
    let score = 0;
    let score_breakdown: any = {};
    
    if (scoreError) {
      console.error('[Leads API] Score calculation error:', scoreError);
      // Fallback scoring if function fails
      score = calculateFallbackScore(body);
      score_breakdown = { source: 'fallback', note: 'Database function failed' };
    } else {
      score = scoreResult || 0;
      score_breakdown = {
        source: body.source || 'manual',
        calculated_at: timestamp,
        method: 'database_function'
      };
    }
    
    // Determine lead type based on score
    const lead_type = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
    
    // Set priority based on score if not provided
    const priority = body.priority || (score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low');
    
    // Prepare lead record
    const leadId = randomUUID();
    const leadRecord = {
      id: leadId,
      company_id: body.company_id || null,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      company: body.company?.trim() || null,
      job_title: body.job_title?.trim() || null,
      score: score,
      score_breakdown: score_breakdown,
      source: body.source || 'manual',
      source_detail: body.source_detail || null,
      campaign_id: body.campaign_id || null,
      landing_page: body.landing_page || null,
      referrer: body.referrer || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      status: body.status || 'new',
      priority: priority,
      lead_type: lead_type,
      assigned_to: body.assigned_to || null,
      assigned_at: body.assigned_to ? timestamp : null,
      estimated_value: body.estimated_value || null,
      currency: body.currency || 'USD',
      preferred_channel: body.preferred_channel || null,
      timezone: body.timezone || null,
      language: body.language || 'en',
      tags: body.tags || [],
      custom_fields: body.custom_fields || {},
      notes: body.notes || null,
      consent_status: body.consent_status || 'pending',
      ip_address: body.ip_address || null,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    // Insert lead
    const { data: insertedLead, error: insertError } = await (supabase as any)
      .from('leads')
      .insert(leadRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('[Leads API] Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${insertError.message}`,
        code: insertError.code,
        timestamp
      }, { status: 500 });
    }
    
    // Create activity log entry
    const { error: activityError } = await (supabase as any)
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        company_id: body.company_id || null,
        activity_type: 'imported',
        activity_subtype: body.source === 'manual' ? 'manual' : 'automated',
        subject: 'Lead created',
        content: `Lead created via ${body.source || 'manual'} with score ${score}`,
        performed_by: body.created_by || 'system',
        performed_by_type: body.created_by ? 'agent' : 'system',
        created_at: timestamp
      });
    
    if (activityError) {
      console.error('[Leads API] Activity log error:', activityError);
      // Don't fail the request if activity logging fails
    }
    
    return NextResponse.json({
      success: true,
      id: leadId,
      status: 'created',
      lead: insertedLead,
      score_calculated: score,
      lead_type: lead_type,
      timestamp
    }, { status: 201 });
    
  } catch (err: any) {
    console.error('[Leads API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// Fallback scoring function (if DB function fails)
// ============================================
function calculateFallbackScore(body: any): number {
  let score = 0;
  
  // Source weight (0-40)
  const sourceWeights: Record<string, number> = {
    manychat: 35,
    campaign: 30,
    website: 25,
    referral: 35,
    linkedin: 20,
    event: 25,
    import: 15,
    manual: 20
  };
  score += sourceWeights[body.source] || 10;
  
  // Data completeness (0-30)
  let dataScore = 10;
  if (body.email) dataScore += 10;
  if (body.name && body.name.length > 3) dataScore += 10;
  score += dataScore;
  
  // Urgency keywords (0-30)
  const text = `${body.name || ''} ${body.notes || ''}`.toLowerCase();
  let urgencyScore = 0;
  
  if (/\b(urgent|asap|immediately|emergency|critical|ready to buy|decision made|budget approved)\b/.test(text)) {
    urgencyScore += 15;
  }
  if (/\b(send quote|call me|interested|pricing|demo|meeting|call)\b/.test(text)) {
    urgencyScore += 10;
  }
  if (/\b(hot|priority|vip|important)\b/.test(text)) {
    urgencyScore += 5;
  }
  score += urgencyScore;
  
  return Math.min(100, score);
}
