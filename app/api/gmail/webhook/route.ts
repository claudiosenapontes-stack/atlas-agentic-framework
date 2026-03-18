/**
 * ATLAS-GMAIL-WEBHOOK
 * ATLAS-MSN-9872
 * 
 * POST /api/gmail/webhook
 * Receive Gmail push notifications and trigger email processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { listEmails } from '@/lib/google-broker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Google Pub/Sub verification token
const PUBSUB_VERIFICATION_TOKEN = process.env.PUBSUB_VERIFICATION_TOKEN || '';

/**
 * Verify Google Pub/Sub webhook signature
 * Note: Full verification requires Google's certificate chain validation
 */
function verifyWebhookAuth(request: NextRequest): boolean {
  const token = request.headers.get('X-Goog-Channel-Token');
  const clientToken = PUBSUB_VERIFICATION_TOKEN;
  
  // If no token configured, accept all (for development)
  if (!clientToken) {
    console.log('[GmailWebhook] No verification token configured, accepting webhook');
    return true;
  }
  
  return token === clientToken;
}

/**
 * Process new emails via the email processor
 */
async function triggerEmailProcessor(emails: any[]) {
  const processorUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/email-processor`
    : 'http://localhost:3000/api/workers/email-processor';
  
  try {
    const response = await fetch(processorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[GmailWebhook] Processor error:', error);
      return { success: false, error };
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[GmailWebhook] Failed to trigger processor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/gmail/webhook
 * Handle Gmail push notifications
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  try {
    // 1. Verify webhook authenticity
    if (!verifyWebhookAuth(request)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        timestamp,
        requestId,
      }, { status: 401 });
    }
    
    // 2. Parse Pub/Sub message
    const body = await request.json();
    
    // Pub/Sub message structure
    const message = body.message;
    if (!message || !message.data) {
      return NextResponse.json({
        success: true,
        message: 'No message data, acknowledged',
        timestamp,
        requestId,
      });
    }
    
    // Decode base64 data
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    console.log('[GmailWebhook] Received:', data);
    
    // 3. Extract email address from watch
    const emailAddress = data.emailAddress;
    const historyId = data.historyId;
    
    if (!emailAddress) {
      return NextResponse.json({
        success: false,
        error: 'No email address in notification',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    // 4. Fetch recent emails from Gmail
    const gmailResult = await listEmails(emailAddress, {
      maxResults: 10,
      query: 'newer_than:1h', // Only process emails from last hour
    });
    
    if (!gmailResult.success) {
      return NextResponse.json({
        success: false,
        error: `Gmail fetch failed: ${gmailResult.error}`,
        timestamp,
        requestId,
      }, { status: 500 });
    }
    
    const emails = gmailResult.messages || [];
    
    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new emails to process',
        emailAddress,
        timestamp,
        requestId,
      });
    }
    
    // 5. Process emails through pipeline
    const processorResult = await triggerEmailProcessor(emails);
    
    return NextResponse.json({
      success: true,
      emailAddress,
      historyId,
      emailsProcessed: emails.length,
      processorResult,
      timestamp,
      requestId,
    });
    
  } catch (error: any) {
    console.error('[GmailWebhook] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      requestId,
    }, { status: 500 });
  }
}

/**
 * GET /api/gmail/webhook
 * Handle webhook verification (Google calls this when setting up the watch)
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  // Return challenge for webhook verification
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  // Health check response
  return NextResponse.json({
    status: 'ready',
    message: 'Gmail webhook endpoint active',
    timestamp,
  });
}
