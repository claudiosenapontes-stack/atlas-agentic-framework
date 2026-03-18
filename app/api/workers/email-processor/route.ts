/**
 * ATLAS-EMAIL-PROCESSOR WORKER
 * ATLAS-MSN-9872
 * 
 * POST /api/workers/email-processor
 * Process incoming emails, match against watchlist, dispatch actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from "@/lib/supabase-admin";
import { matchEmailToWatchRules, EmailData } from "@/lib/watchlist-matcher";
import { dispatchActions } from "@/lib/action-dispatcher";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Process a single email through the pipeline
 */
async function processEmail(email: EmailData): Promise<{
  messageId: string;
  matches: number;
  actions: Array<{ type: string; id: string; status: string }>;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // 1. Match against watch rules
    const matches = await matchEmailToWatchRules(email);
    
    // 2. Dispatch actions for each match
    const actions: Array<{ type: string; id: string; status: string }> = [];
    
    for (const match of matches) {
      try {
        const dispatched = await dispatchActions(match, {
          messageId: email.id,
          subject: email.subject,
          from: email.from,
          snippet: email.snippet,
          receivedAt: email.date,
        });
        actions.push(...dispatched.map(a => ({
          type: a.type,
          id: a.id,
          status: a.status,
        })));
      } catch (error: any) {
        errors.push(`Failed to dispatch for rule ${match.rule.id}: ${error.message}`);
      }
    }
    
    return {
      messageId: email.id,
      matches: matches.length,
      actions,
      errors,
    };
  } catch (error: any) {
    errors.push(`Failed to process email: ${error.message}`);
    return {
      messageId: email.id,
      matches: 0,
      actions: [],
      errors,
    };
  }
}

/**
 * POST /api/workers/email-processor
 * Process one or more emails
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { emails, singleEmail } = body;
    
    // Support both single email and batch processing
    const emailsToProcess: EmailData[] = singleEmail 
      ? [singleEmail]
      : (emails || []);
    
    if (emailsToProcess.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No emails provided. Use "singleEmail" or "emails" field.',
        timestamp,
        requestId,
        duration: Date.now() - startTime,
      }, { status: 400 });
    }
    
    // Process all emails
    const results = [];
    for (const email of emailsToProcess) {
      const result = await processEmail(email);
      results.push(result);
    }
    
    const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
    const totalActions = results.reduce((sum, r) => sum + r.actions.length, 0);
    const allErrors = results.flatMap(r => r.errors);
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      matches: totalMatches,
      actionsCreated: totalActions,
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
      timestamp,
      requestId,
      duration: Date.now() - startTime,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
      duration,
    }, { status: 500 });
  }
}

/**
 * GET /api/workers/email-processor
 * Health check and status
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // Load active watch rules count
    const supabase = getSupabaseAdmin();
    const { count, error } = await withDbRetry(async () => {
      return await (supabase as any)
        .from('watch_rules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    }, 'get_active_rules_count');
    
    if (error) throw error;
    
    return NextResponse.json({
      status: 'ready',
      activeWatchRules: count || 0,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}
