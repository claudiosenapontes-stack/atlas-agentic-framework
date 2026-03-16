/**
 * ATLAS-LEADS-SCORE API
 * ATLAS-SOPHIA-LEADS-MODULE-START-002
 * 
 * POST /api/leads/score
 * Recalculate or preview lead scores
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// ============================================
// POST /api/leads/score
// Recalculate lead scores or preview score for new lead
// ============================================
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    
    // Mode: preview (for new leads) or recalculate (for existing)
    const mode = body.mode || 'preview';
    
    if (mode === 'recalculate' && body.lead_id) {
      // Recalculate score for existing lead
      return await recalculateLeadScore(body.lead_id, timestamp);
    } else if (mode === 'batch') {
      // Recalculate all leads or filtered set
      return await batchRecalculateScores(body.filters || {}, timestamp);
    } else {
      // Preview score for new lead data
      return await previewScore(body, timestamp);
    }
    
  } catch (err: any) {
    console.error('[Leads Score API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// GET /api/leads/score
// Get scoring configuration and thresholds
// ============================================
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');
    
    if (lead_id) {
      // Return specific lead's score details
      const supabase = getSupabaseAdmin();
      const { data: lead, error } = await (supabase as any)
        .from('leads')
        .select('id, name, score, score_breakdown, lead_type, source')
        .eq('id', lead_id)
        .single();
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: `Lead not found: ${error.message}`,
          timestamp
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        lead,
        timestamp
      });
    }
    
    // Return scoring configuration
    return NextResponse.json({
      success: true,
      scoring_config: {
        max_score: 100,
        thresholds: {
          hot: { min: 80, label: 'Hot', color: '#EF4444', priority: 'high' },
          warm: { min: 50, label: 'Warm', color: '#F59E0B', priority: 'medium' },
          cold: { min: 0, label: 'Cold', color: '#6B7280', priority: 'low' }
        },
        weights: {
          source: { max: 40, description: 'Lead source weight' },
          engagement: { max: 30, description: 'Data completeness and engagement' },
          urgency: { max: 30, description: 'Urgency keywords in content' }
        },
        source_weights: {
          manychat: 35,
          campaign: 30,
          referral: 35,
          website: 25,
          event: 25,
          linkedin: 20,
          manual: 20,
          import: 15,
          other: 10
        },
        urgency_keywords: {
          high: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'ready to buy', 'decision made', 'budget approved'],
          medium: ['send quote', 'call me', 'interested', 'pricing', 'demo', 'meeting', 'call'],
          low: ['hot', 'priority', 'vip', 'important']
        }
      },
      timestamp
    });
    
  } catch (err: any) {
    console.error('[Leads Score API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}

// ============================================
// Recalculate score for existing lead
// ============================================
async function recalculateLeadScore(leadId: string, timestamp: string) {
  const supabase = getSupabaseAdmin();
  
  // Get lead data
  const { data: lead, error: fetchError } = await (supabase as any)
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  if (fetchError || !lead) {
    return NextResponse.json({
      success: false,
      error: `Lead not found: ${fetchError?.message || 'Unknown error'}`,
      timestamp
    }, { status: 404 });
  }
  
  // Calculate new score
  const { data: newScore, error: scoreError } = await (supabase as any)
    .rpc('calculate_lead_score', {
      p_source: lead.source || 'manual',
      p_name: lead.name,
      p_email: lead.email || '',
      p_notes: lead.notes || '',
      p_custom_fields: lead.custom_fields || {}
    });
  
  if (scoreError) {
    console.error('[Leads Score API] Score calculation error:', scoreError);
    return NextResponse.json({
      success: false,
      error: `Score calculation failed: ${scoreError.message}`,
      timestamp
    }, { status: 500 });
  }
  
  const score = newScore || 0;
  const lead_type = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
  const priority = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
  
  // Update lead
  const { data: updatedLead, error: updateError } = await (supabase as any)
    .from('leads')
    .update({
      score: score,
      score_breakdown: {
        previous_score: lead.score,
        recalculated_at: timestamp,
        method: 'api_recalculation'
      },
      lead_type: lead_type,
      priority: priority,
      updated_at: timestamp
    })
    .eq('id', leadId)
    .select()
    .single();
  
  if (updateError) {
    return NextResponse.json({
      success: false,
      error: `Update failed: ${updateError.message}`,
      timestamp
    }, { status: 500 });
  }
  
  // Log activity
  await (supabase as any).from('lead_activities').insert({
    lead_id: leadId,
    company_id: lead.company_id,
    activity_type: 'score_change',
    activity_subtype: 'automated',
    subject: 'Score recalculated',
    content: `Score updated from ${lead.score} to ${score}`,
    performed_by: 'system',
    performed_by_type: 'system',
    created_at: timestamp
  });
  
  return NextResponse.json({
    success: true,
    lead_id: leadId,
    previous_score: lead.score,
    new_score: score,
    lead_type: lead_type,
    priority: priority,
    lead: updatedLead,
    timestamp
  });
}

// ============================================
// Batch recalculate scores
// ============================================
async function batchRecalculateScores(filters: any, timestamp: string) {
  const supabase = getSupabaseAdmin();
  
  // Build query for leads to recalculate
  let query = (supabase as any).from('leads').select('id');
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.min_score !== undefined) {
    query = query.gte('score', filters.min_score);
  }
  
  if (filters.max_score !== undefined) {
    query = query.lte('score', filters.max_score);
  }
  
  const { data: leads, error } = await query;
  
  if (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to fetch leads: ${error.message}`,
      timestamp
    }, { status: 500 });
  }
  
  const results = {
    processed: 0,
    errors: 0,
    details: [] as any[]
  };
  
  // Process each lead
  for (const lead of (leads || [])) {
    try {
      const recalcResult = await recalculateLeadScore(lead.id, timestamp);
      if (recalcResult.status === 200) {
        results.processed++;
      } else {
        results.errors++;
      }
    } catch (err) {
      results.errors++;
    }
  }
  
  return NextResponse.json({
    success: true,
    batch_results: results,
    total_leads: leads?.length || 0,
    timestamp
  });
}

// ============================================
// Preview score for new lead data
// ============================================
async function previewScore(body: any, timestamp: string) {
  const supabase = getSupabaseAdmin();
  
  // Calculate score using database function
  const { data: score, error: scoreError } = await (supabase as any)
    .rpc('calculate_lead_score', {
      p_source: body.source || 'manual',
      p_name: body.name || '',
      p_email: body.email || '',
      p_notes: body.notes || '',
      p_custom_fields: body.custom_fields || {}
    });
  
  if (scoreError) {
    // Fallback calculation
    const fallbackScore = calculateFallbackScore(body);
    return NextResponse.json({
      success: true,
      preview: true,
      score: fallbackScore,
      lead_type: fallbackScore >= 80 ? 'hot' : fallbackScore >= 50 ? 'warm' : 'cold',
      priority: fallbackScore >= 80 ? 'high' : fallbackScore >= 50 ? 'medium' : 'low',
      note: 'Using fallback scoring (database function unavailable)',
      timestamp
    });
  }
  
  const finalScore = score || 0;
  
  return NextResponse.json({
    success: true,
    preview: true,
    score: finalScore,
    lead_type: finalScore >= 80 ? 'hot' : finalScore >= 50 ? 'warm' : 'cold',
    priority: finalScore >= 80 ? 'high' : finalScore >= 50 ? 'medium' : 'low',
    inputs: {
      source: body.source,
      name: body.name,
      has_email: !!body.email,
      has_notes: !!body.notes
    },
    timestamp
  });
}

// ============================================
// Fallback scoring function
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
