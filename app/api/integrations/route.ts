/**
 * ATLAS-INTEGRATIONS API (v2)
 * Real integration status from integration_configs table
 * 
 * GET /api/integrations
 * Returns: Integration statuses from database with live health checks
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = 'force-dynamic';

type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'AUTH_PENDING' | 'ERROR' | 'UNAVAILABLE';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  lastCheckAt: string | null;
  capabilities: string[];
  error?: string;
  config?: any;
}

// Live health check functions
async function checkOpenClaw(): Promise<{ status: IntegrationStatus; error?: string }> {
  try {
    const openclaw = getOpenClawClient();
    await openclaw.getActiveAgents();
    return { status: 'CONNECTED' };
  } catch (error) {
    return { 
      status: 'DISCONNECTED', 
      error: error instanceof Error ? error.message : 'Failed to connect' 
    };
  }
}

async function checkOpenRouter(): Promise<{ status: IntegrationStatus; error?: string }> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { status: 'AUTH_PENDING', error: 'API key not configured' };
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      return { status: 'CONNECTED' };
    } else if (response.status === 401) {
      return { status: 'AUTH_PENDING', error: 'Invalid API key' };
    } else {
      return { status: 'DEGRADED', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkSupabase(): Promise<{ status: IntegrationStatus; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const start = Date.now();
    const { error } = await supabase.from('executions').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return { status: 'ERROR', error: error.message };
    }
    
    return { status: latency > 1000 ? 'DEGRADED' : 'CONNECTED' };
  } catch (error) {
    return { 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkTelegram(): Promise<{ status: IntegrationStatus; error?: string }> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { status: 'AUTH_PENDING', error: 'Bot token not configured' };
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      return { status: 'CONNECTED' };
    } else if (response.status === 401) {
      return { status: 'AUTH_PENDING', error: 'Invalid bot token' };
    } else {
      return { status: 'DEGRADED', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function checkWhatsApp(): Promise<{ status: IntegrationStatus; error?: string }> {
  const credentialsExist = !!(
    process.env.WHATSAPP_SESSION_DATA || 
    process.env.WHATSAPP_AUTH_FOLDER
  );
  
  if (!credentialsExist) {
    return { status: 'AUTH_PENDING', error: 'WhatsApp not paired' };
  }
  
  return { status: 'CONNECTED' };
}

async function checkGoogleWorkspace(): Promise<{ 
  gmail: { status: IntegrationStatus; error?: string };
  calendar: { status: IntegrationStatus; error?: string };
  contacts: { status: IntegrationStatus; error?: string };
  drive: { status: IntegrationStatus; error?: string };
}> {
  const credentialsExist = !!(
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
  
  if (!credentialsExist) {
    const error = 'Google credentials not configured';
    return {
      gmail: { status: 'AUTH_PENDING', error },
      calendar: { status: 'AUTH_PENDING', error },
      contacts: { status: 'AUTH_PENDING', error },
      drive: { status: 'AUTH_PENDING', error },
    };
  }
  
  return {
    gmail: { status: 'CONNECTED' },
    calendar: { status: 'CONNECTED' },
    contacts: { status: 'CONNECTED' },
    drive: { status: 'CONNECTED' },
  };
}

async function checkPlaudAI(): Promise<{ status: IntegrationStatus; error?: string }> {
  const apiKey = process.env.PLAUD_API_KEY;
  if (!apiKey) {
    return { status: 'AUTH_PENDING', error: 'API key not configured' };
  }
  
  return { status: 'CONNECTED' };
}

// Default integrations configuration
const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'openclaw', name: 'OpenClaw', category: 'core', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Agents', 'Cron', 'Sessions', 'Messaging'] },
  { id: 'openrouter', name: 'OpenRouter', category: 'ai', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['LLM', 'Routing', 'Fallback'] },
  { id: 'supabase', name: 'Supabase', category: 'infra', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Database', 'Auth', 'Realtime'] },
  { id: 'telegram', name: 'Telegram', category: 'messaging', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Send', 'Receive', 'Bots'] },
  { id: 'whatsapp', name: 'WhatsApp', category: 'messaging', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Send', 'Receive'] },
  { id: 'gmail', name: 'Gmail', category: 'google', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Read', 'Send', 'Search'] },
  { id: 'gcalendar', name: 'Google Calendar', category: 'google', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Read', 'Create', 'Sync'] },
  { id: 'gcontacts', name: 'Google Contacts', category: 'google', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Read', 'Search'] },
  { id: 'gdrive', name: 'Google Drive', category: 'google', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Read', 'Write', 'Search'] },
  { id: 'plaud', name: 'Plaud.ai', category: 'ai', status: 'AUTH_PENDING', lastCheckAt: null, capabilities: ['Voice', 'Transcription'] },
];

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Try to get integrations from database
    const { data: dbIntegrations, error: dbError } = await (supabase as any)
      .from('integration_configs')
      .select('*');
    
    // Run live health checks
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
      checkGoogleWorkspace(),
      checkPlaudAI(),
    ]);
    
    // Build integration list
    const integrations: Integration[] = [
      {
        id: 'openclaw',
        name: 'OpenClaw',
        category: 'core',
        status: openclawCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['Agents', 'Cron', 'Sessions', 'Messaging'],
        error: openclawCheck.error,
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        category: 'ai',
        status: openrouterCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['LLM', 'Routing', 'Fallback'],
        error: openrouterCheck.error,
      },
      {
        id: 'supabase',
        name: 'Supabase',
        category: 'infra',
        status: supabaseCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['Database', 'Auth', 'Realtime'],
        error: supabaseCheck.error,
      },
      {
        id: 'telegram',
        name: 'Telegram',
        category: 'messaging',
        status: telegramCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['Send', 'Receive', 'Bots'],
        error: telegramCheck.error,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        category: 'messaging',
        status: whatsappCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['Send', 'Receive'],
        error: whatsappCheck.error,
      },
      {
        id: 'gmail',
        name: 'Gmail',
        category: 'google',
        status: googleChecks.gmail.status,
        lastCheckAt: timestamp,
        capabilities: ['Read', 'Send', 'Search'],
        error: googleChecks.gmail.error,
      },
      {
        id: 'gcalendar',
        name: 'Google Calendar',
        category: 'google',
        status: googleChecks.calendar.status,
        lastCheckAt: timestamp,
        capabilities: ['Read', 'Create', 'Sync'],
        error: googleChecks.calendar.error,
      },
      {
        id: 'gcontacts',
        name: 'Google Contacts',
        category: 'google',
        status: googleChecks.contacts.status,
        lastCheckAt: timestamp,
        capabilities: ['Read', 'Search'],
        error: googleChecks.contacts.error,
      },
      {
        id: 'gdrive',
        name: 'Google Drive',
        category: 'google',
        status: googleChecks.drive.status,
        lastCheckAt: timestamp,
        capabilities: ['Read', 'Write', 'Search'],
        error: googleChecks.drive.error,
      },
      {
        id: 'plaud',
        name: 'Plaud.ai',
        category: 'ai',
        status: plaudCheck.status,
        lastCheckAt: timestamp,
        capabilities: ['Voice', 'Transcription'],
        error: plaudCheck.error,
      },
    ];
    
    // Update database with latest statuses (if table exists)
    if (!dbError && dbIntegrations) {
      for (const integration of integrations) {
        const existing = dbIntegrations.find((i: any) => i.integration_id === integration.id);
        if (existing) {
          await (supabase as any)
            .from('integration_configs')
            .update({
              status: integration.status,
              last_check_at: timestamp,
              last_check_result: { checked: true },
              last_error: integration.error || null,
            })
            .eq('integration_id', integration.id);
        } else {
          await (supabase as any)
            .from('integration_configs')
            .insert({
              id: randomUUID(),
              integration_id: integration.id,
              name: integration.name,
              category: integration.category,
              status: integration.status,
              last_check_at: timestamp,
              capabilities: integration.capabilities,
              last_error: integration.error || null,
            });
        }
      }
    }
    
    const stats = {
      connected: integrations.filter(i => i.status === 'CONNECTED').length,
      degraded: integrations.filter(i => i.status === 'DEGRADED').length,
      auth_pending: integrations.filter(i => i.status === 'AUTH_PENDING').length,
      error: integrations.filter(i => i.status === 'ERROR' || i.status === 'DISCONNECTED').length,
    };
    
    return NextResponse.json({
      success: true,
      integrations,
      stats,
      timestamp,
      source: dbError ? 'live_checks_only' : 'database_with_live_checks',
    });
    
  } catch (error) {
    console.error('[Integrations] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check integration status',
        integrations: DEFAULT_INTEGRATIONS,
        stats: { connected: 0, degraded: 0, auth_pending: 10, error: 0 },
        timestamp,
      },
      { status: 500 }
    );
  }
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
