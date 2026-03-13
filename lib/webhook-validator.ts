import { createHmac, timingSafeEqual } from 'crypto';

// Webhook signature verification for OpenClaw events
const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || '';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  event_id: string;
  session_key: string;
  agent_id: string;
  company_id?: string;
  payload: unknown;
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] No WEBHOOK_SECRET configured, skipping verification');
    return true; // Allow in dev mode
  }
  
  if (!signature) {
    console.error('[Webhook] Missing signature header');
    return false;
  }
  
  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  // Constant-time comparison
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export function parseWebhookPayload(body: string): WebhookPayload | null {
  try {
    const parsed = JSON.parse(body);
    
    // Validate required fields
    if (!parsed.event || !parsed.timestamp || !parsed.session_key) {
      console.error('[Webhook] Missing required fields');
      return null;
    }
    
    return parsed as WebhookPayload;
  } catch (error) {
    console.error('[Webhook] JSON parse error:', error);
    return null;
  }
}

export function getCompanyFromAgent(agentId: string): string {
  // All agents belong to the default company
  // TODO: Replace with dynamic lookup from Supabase when multi-tenant
  return process.env.DEFAULT_COMPANY_ID || '29712e4c-a88a-4269-8adb-2802a79087a6';
}
