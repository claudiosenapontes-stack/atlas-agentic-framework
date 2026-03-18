/**
 * ATLAS-EMAIL-CLASSIFY
 * Classify incoming emails against watchlist rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface EmailPayload {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  received_at: string;
  thread_id?: string;
}

interface ClassificationResult {
  email_id: string;
  matched: boolean;
  matches: Array<{
    rule_id: string;
    rule_name: string;
    pattern: string;
    confidence: number;
    action_type: string;
  }>;
  primary_action?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const email: EmailPayload = await request.json();
    const supabase = getSupabaseAdmin();

    // Fetch active watch rules
    const { data: rules, error: rulesError } = await supabase
      .from('watch_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      throw new Error(`Failed to fetch watch rules: ${rulesError.message}`);
    }

    const matches: ClassificationResult['matches'] = [];
    let highestUrgency: ClassificationResult['urgency'] = 'low';

    // Check each rule against the email
    for (const rule of (rules || [])) {
      const pattern = rule.pattern?.toLowerCase() || '';
      const from = email.from?.toLowerCase() || '';
      const subject = email.subject?.toLowerCase() || '';
      const body = email.body?.toLowerCase() || '';

      let matched = false;
      let confidence = 0;

      // Pattern matching logic
      if (rule.rule_type === 'keyword_match') {
        // Check if pattern exists in from, subject, or body
        if (from.includes(pattern) || subject.includes(pattern) || body.includes(pattern)) {
          matched = true;
          confidence = from.includes(pattern) ? 1.0 : 0.8;
        }
      } else if (rule.rule_type === 'domain_match') {
        // Extract domain from email and match
        const domain = from.split('@')[1];
        if (domain?.includes(pattern)) {
          matched = true;
          confidence = 0.9;
        }
      } else if (rule.rule_type === 'exact_match') {
        if (from === pattern) {
          matched = true;
          confidence = 1.0;
        }
      }

      if (matched) {
        matches.push({
          rule_id: rule.id,
          rule_name: rule.name,
          pattern: rule.pattern,
          confidence,
          action_type: rule.action_type,
        });

        // Determine urgency based on rule type
        if (rule.rule_type === 'critical_alert' || rule.rule_type === 'ceo_escalation') {
          highestUrgency = 'critical';
        } else if (rule.rule_type === 'opportunity' || rule.rule_type === 'lead') {
          if (highestUrgency !== 'critical') highestUrgency = 'high';
        } else if (rule.rule_type === 'keyword_match' && highestUrgency === 'low') {
          highestUrgency = 'medium';
        }
      }
    }

    const result: ClassificationResult = {
      email_id: email.id,
      matched: matches.length > 0,
      matches,
      primary_action: matches.length > 0 ? matches[0].action_type : undefined,
      urgency: highestUrgency,
    };

    // Store classification result
    await supabase.from('email_classifications').insert({
      email_id: email.id,
      classification: result,
      created_at: timestamp,
    });

    return NextResponse.json({
      success: true,
      result,
      timestamp,
    });

  } catch (error: any) {
    console.error('Email classification error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Email classification endpoint active',
    timestamp: new Date().toISOString(),
  });
}
