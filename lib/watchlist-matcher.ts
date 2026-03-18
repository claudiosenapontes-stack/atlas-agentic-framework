/**
 * ATLAS-WATCHLIST-MATCHER
 * ATLAS-MSN-9872
 * 
 * Match incoming emails against watch_rules
 */

import { getSupabaseAdmin, withDbRetry } from "./supabase-admin";

export interface EmailData {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
  labels: string[];
}

export interface WatchRule {
  id: string;
  name: string;
  pattern: string;
  rule_type: string;
  action_type: string;
  is_active: boolean;
  priority: string;
  critical_keywords: string[];
  high_keywords: string[];
  medium_keywords: string[];
  exclude_keywords: string[];
  auto_execute: boolean;
  require_approval: boolean;
  max_daily_alerts: number;
  cooldown_minutes: number;
  notify_agent_ids: string[];
  notify_emails: string[];
  owner_id?: string;
  company_id?: string;
  description?: string;
}

export interface MatchResult {
  rule: WatchRule;
  confidence: number;
  matchedFields: string[];
  matchedKeywords: string[];
}

/**
 * Load active watch rules from database
 */
export async function loadActiveWatchRules(): Promise<WatchRule[]> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await withDbRetry(async () => {
    return await (supabase as any)
      .from('watch_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });
  }, 'load_active_watch_rules');
  
  if (error) {
    console.error('[WatchlistMatcher] Failed to load rules:', error);
    throw error;
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    critical_keywords: item.critical_keywords || [],
    high_keywords: item.high_keywords || [],
    medium_keywords: item.medium_keywords || [],
    exclude_keywords: item.exclude_keywords || [],
    notify_agent_ids: item.notify_agent_ids || [],
    notify_emails: item.notify_emails || [],
  }));
}

/**
 * Check if email matches a watch rule
 */
export function matchEmailAgainstRule(email: EmailData, rule: WatchRule): MatchResult | null {
  const matchedFields: string[] = [];
  const matchedKeywords: string[] = [];
  let confidence = 0;
  
  const emailBody = (email.body || email.snippet || '').toLowerCase();
  const emailSubject = (email.subject || '').toLowerCase();
  const emailFrom = (email.from || '').toLowerCase();
  
  // 1. Pattern match (sender email)
  if (rule.pattern) {
    const pattern = rule.pattern.toLowerCase();
    const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    if (patternRegex.test(emailFrom) || emailFrom.includes(pattern)) {
      matchedFields.push('from');
      confidence += 0.5;
    }
  }
  
  // 2. Keyword matching with priority scoring
  const allContent = `${emailSubject} ${emailBody}`;
  
  // Critical keywords (highest weight)
  for (const keyword of rule.critical_keywords) {
    if (keyword && allContent.includes(keyword.toLowerCase())) {
      matchedKeywords.push(`critical:${keyword}`);
      confidence += 0.3;
    }
  }
  
  // High priority keywords
  for (const keyword of rule.high_keywords) {
    if (keyword && allContent.includes(keyword.toLowerCase())) {
      matchedKeywords.push(`high:${keyword}`);
      confidence += 0.2;
    }
  }
  
  // Medium priority keywords
  for (const keyword of rule.medium_keywords) {
    if (keyword && allContent.includes(keyword.toLowerCase())) {
      matchedKeywords.push(`medium:${keyword}`);
      confidence += 0.1;
    }
  }
  
  // 3. Exclude keywords (negative match)
  for (const keyword of rule.exclude_keywords) {
    if (keyword && allContent.includes(keyword.toLowerCase())) {
      return null; // Excluded - no match
    }
  }
  
  // Require at least some match
  if (confidence < 0.1 && matchedFields.length === 0) {
    return null;
  }
  
  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    rule,
    confidence,
    matchedFields,
    matchedKeywords,
  };
}

/**
 * Match email against all active watch rules
 */
export async function matchEmailToWatchRules(email: EmailData): Promise<MatchResult[]> {
  const rules = await loadActiveWatchRules();
  const matches: MatchResult[] = [];
  
  for (const rule of rules) {
    const match = matchEmailAgainstRule(email, rule);
    if (match) {
      matches.push(match);
    }
  }
  
  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}
