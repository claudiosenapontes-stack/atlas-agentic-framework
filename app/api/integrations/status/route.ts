/**
 * ATLAS-INTEGRATIONS-STATUS API (Unified Schema)
 * ATLAS-SEVERINO-OBSERVABILITY-PATCH-001
 * 
 * GET /api/integrations/status
 * Returns: Unified integration state schema { name, connected, capabilities, last_check, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = 'force-dynamic';

type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'AUTH_PENDING' | 'ERROR' | 'UNAVAILABLE';

interface UnifiedIntegration {
  name: string;
  connected: boolean;
  capabilities: string[];
  last_check: string;
  error?: string;
  category: string;
  status: IntegrationStatus;
}

// Live health check functions
async function checkOpenClaw(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string; latency?: number }> {
  const start = Date.now();
  try {
    const openclaw = getOpenClawClient();
    await openclaw.getActiveAgents();
    return { connected: true, status: 'CONNECTED', latency: Date.now() - start };
  } catch (error) {
    return { 
      connected: false, 
      status: 'DISCONNECTED', 
      error: error instanceof Error ? error.message : 'Failed to connect',
      latency: Date.now() - start
    };
  }
}

async function checkOpenRouter(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string }> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { connected: false, status: 'AUTH_PENDING', error: 'API key not configured' };
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      return { connected: true, status: 'CONNECTED' };
    } else if (response.status === 401) {
      return { connected: false, status: 'AUTH_PENDING', error: 'Invalid API key' };
    } else {
      return { connected: false, status: 'DEGRADED', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      connected: false, 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkSupabase(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const start = Date.now();
    const { error } = await supabase.from('executions').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return { connected: false, status: 'ERROR', error: error.message };
    }
    
    return { 
      connected: true, 
      status: latency > 1000 ? 'DEGRADED' : 'CONNECTED',
    };
  } catch (error) {
    return { 
      connected: false, 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkTelegram(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string }> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { connected: false, status: 'AUTH_PENDING', error: 'Bot token not configured' };
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      return { connected: true, status: 'CONNECTED' };
    } else if (response.status === 401) {
      return { connected: false, status: 'AUTH_PENDING', error: 'Invalid bot token' };
    } else {
      return { connected: false, status: 'DEGRADED', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      connected: false, 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkWhatsApp(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string }> {
  const credentialsExist = !!(
    process.env.WHATSAPP_SESSION_DATA || 
    process.env.WHATSAPP_AUTH_FOLDER
  );
  
  if (!credentialsExist) {
    return { connected: false, status: 'AUTH_PENDING', error: 'WhatsApp not paired' };
  }
  
  return { connected: true, status: 'CONNECTED' };
}

async function checkGoogleServices(): Promise<Record<string, { connected: boolean; status: IntegrationStatus; error?: string }>> {
  const credentialsExist = !!(
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  const error = credentialsExist ? undefined : 'Google credentials not configured';
  const status: IntegrationStatus = credentialsExist ? 'CONNECTED' : 'AUTH_PENDING';
  
  return {
    gmail: { connected: credentialsExist, status, error },
    calendar: { connected: credentialsExist, status, error },
    contacts: { connected: credentialsExist, status, error },
    drive: { connected: credentialsExist, status, error },
  };
}

async function checkPlaudAI(): Promise<{ connected: boolean; status: IntegrationStatus; error?: string }> {
  const apiKey = process.env.PLAUD_API_KEY;
  if (!apiKey) {
    return { connected: false, status: 'AUTH_PENDING', error: 'API key not configured' };
  }
  
  return { connected: true, status: 'CONNECTED' };
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // Run all health checks in parallel
    const [
      openclawCheck,
      openrouterCheck,
      supabaseCheck,
      telegramCheck,
      whatsappCheck,
      googleChecks,
      plaudCheck,
    ] = await Promise.all([
      checkOpenClaw(),
      checkOpenRouter(),
      checkSupabase(),
      checkTelegram(),
      checkWhatsApp(),
      checkGoogleServices(),
      checkPlaudAI(),
    ]);
    
    // Build unified integration list
    const integrations: UnifiedIntegration[] = [
      {
        name: 'OpenClaw',
        connected: openclawCheck.connected,
        capabilities: ['Agents', 'Cron', 'Sessions', 'Messaging'],
        last_check: timestamp,
        error: openclawCheck.error,
        category: 'core',
        status: openclawCheck.status,
      },
      {
        name: 'OpenRouter',
        connected: openrouterCheck.connected,
        capabilities: ['LLM', 'Routing', 'Fallback'],
        last_check: timestamp,
        error: openrouterCheck.error,
        category: 'ai',
        status: openrouterCheck.status,
      },
      {
        name: 'Supabase',
        connected: supabaseCheck.connected,
        capabilities: ['Database', 'Auth', 'Realtime'],
        last_check: timestamp,
        error: supabaseCheck.error,
        category: 'infra',
        status: supabaseCheck.status,
      },
      {
        name: 'Telegram',
        connected: telegramCheck.connected,
        capabilities: ['Send', 'Receive', 'Bots'],
        last_check: timestamp,
        error: telegramCheck.error,
        category: 'messaging',
        status: telegramCheck.status,
      },
      {
        name: 'WhatsApp',
        connected: whatsappCheck.connected,
        capabilities: ['Send', 'Receive'],
        last_check: timestamp,
        error: whatsappCheck.error,
        category: 'messaging',
        status: whatsappCheck.status,
      },
      {
        name: 'Gmail',
        connected: googleChecks.gmail.connected,
        capabilities: ['Read', 'Send', 'Search'],
        last_check: timestamp,
        error: googleChecks.gmail.error,
        category: 'google',
        status: googleChecks.gmail.status,
      },
      {
        name: 'Google Calendar',
        connected: googleChecks.calendar.connected,
        capabilities: ['Read', 'Create', 'Sync'],
        last_check: timestamp,
        error: googleChecks.calendar.error,
        category: 'google',
        status: googleChecks.calendar.status,
      },
      {
        name: 'Google Contacts',
        connected: googleChecks.contacts.connected,
        capabilities: ['Read', 'Search'],
        last_check: timestamp,
        error: googleChecks.contacts.error,
        category: 'google',
        status: googleChecks.contacts.status,
      },
      {
        name: 'Google Drive',
        connected: googleChecks.drive.connected,
        capabilities: ['Read', 'Write', 'Search'],
        last_check: timestamp,
        error: googleChecks.drive.error,
        category: 'google',
        status: googleChecks.drive.status,
      },
      {
        name: 'Plaud.ai',
        connected: plaudCheck.connected,
        capabilities: ['Voice', 'Transcription'],
        last_check: timestamp,
        error: plaudCheck.error,
        category: 'ai',
        status: plaudCheck.status,
      },
    ];
    
    // Calculate stats
    const stats = {
      total: integrations.length,
      connected: integrations.filter(i => i.connected).length,
      disconnected: integrations.filter(i => !i.connected && i.status === 'DISCONNECTED').length,
      degraded: integrations.filter(i => i.status === 'DEGRADED').length,
      auth_pending: integrations.filter(i => i.status === 'AUTH_PENDING').length,
      error: integrations.filter(i => i.status === 'ERROR').length,
    };
    
    // Persist to database
    try {
      const supabase = getSupabaseAdmin();
      for (const integration of integrations) {
        await (supabase as any)
          .from('integration_health')
          .upsert({
            integration_id: integration.name.toLowerCase().replace(/\s+/g, '_'),
            name: integration.name,
            category: integration.category,
            connected: integration.connected,
            status: integration.status,
            capabilities: integration.capabilities,
            last_check_at: timestamp,
            last_error: integration.error || null,
          }, {
            onConflict: 'integration_id'
          });
      }
    } catch (dbError) {
      console.error('[Integrations Status] DB persist error:', dbError);
    }
    
    return NextResponse.json({
      success: true,
      integrations,
      stats,
      timestamp,
      schema_version: 'unified_v1',
    });
    
  } catch (error) {
    console.error('[Integrations Status] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check integration status',
        integrations: [],
        stats: null,
        timestamp,
      },
      { status: 500 }
    );
  }
}
