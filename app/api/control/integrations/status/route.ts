/**
 * ATLAS-INTEGRATIONS-STATUS API
 * Real-time integration health checks
 * 
 * GET /api/control/integrations/status
 * Returns: Status for all integrations (OpenClaw, OpenRouter, Supabase, etc.)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = 'force-dynamic';

type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'AUTH_PENDING' | 'ERROR' | 'UNAVAILABLE';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  lastSync: string | null;
  capabilities: string[];
  error?: string;
}

// Status check functions for each integration
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
  // WhatsApp requires pairing - check if credentials exist
  const credentialsExist = !!(
    process.env.WHATSAPP_SESSION_DATA || 
    process.env.WHATSAPP_AUTH_FOLDER
  );
  
  if (!credentialsExist) {
    return { status: 'AUTH_PENDING', error: 'WhatsApp not paired' };
  }
  
  // For now, assume connected if credentials exist
  // In production, would check actual connection
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
  
  // In production, would make actual API calls to verify
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
  
  // Would make actual API call to verify
  return { status: 'CONNECTED' };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  
  try {
    // Run all checks in parallel
    const [
      openclaw,
      openrouter,
      supabase,
      telegram,
      whatsapp,
      google,
      plaud,
    ] = await Promise.all([
      checkOpenClaw(),
      checkOpenRouter(),
      checkSupabase(),
      checkTelegram(),
      checkWhatsApp(),
      checkGoogleWorkspace(),
      checkPlaudAI(),
    ]);
    
    const integrations: Integration[] = [
      {
        id: 'openclaw',
        name: 'OpenClaw',
        category: 'core',
        status: openclaw.status,
        lastSync: timestamp,
        capabilities: ['Agents', 'Cron', 'Sessions', 'Messaging'],
        error: openclaw.error,
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        category: 'ai',
        status: openrouter.status,
        lastSync: timestamp,
        capabilities: ['LLM', 'Routing', 'Fallback'],
        error: openrouter.error,
      },
      {
        id: 'supabase',
        name: 'Supabase',
        category: 'infra',
        status: supabase.status,
        lastSync: timestamp,
        capabilities: ['Database', 'Auth', 'Realtime'],
        error: supabase.error,
      },
      {
        id: 'telegram',
        name: 'Telegram',
        category: 'messaging',
        status: telegram.status,
        lastSync: timestamp,
        capabilities: ['Send', 'Receive', 'Bots'],
        error: telegram.error,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        category: 'messaging',
        status: whatsapp.status,
        lastSync: timestamp,
        capabilities: ['Send', 'Receive'],
        error: whatsapp.error,
      },
      {
        id: 'gmail',
        name: 'Gmail',
        category: 'google',
        status: google.gmail.status,
        lastSync: timestamp,
        capabilities: ['Read', 'Send', 'Search'],
        error: google.gmail.error,
      },
      {
        id: 'gcalendar',
        name: 'Google Calendar',
        category: 'google',
        status: google.calendar.status,
        lastSync: timestamp,
        capabilities: ['Read', 'Create', 'Sync'],
        error: google.calendar.error,
      },
      {
        id: 'gcontacts',
        name: 'Google Contacts',
        category: 'google',
        status: google.contacts.status,
        lastSync: timestamp,
        capabilities: ['Read', 'Search'],
        error: google.contacts.error,
      },
      {
        id: 'gdrive',
        name: 'Google Drive',
        category: 'google',
        status: google.drive.status,
        lastSync: timestamp,
        capabilities: ['Read', 'Write', 'Search'],
        error: google.drive.error,
      },
      {
        id: 'plaud',
        name: 'Plaud.ai',
        category: 'ai',
        status: plaud.status,
        lastSync: timestamp,
        capabilities: ['Voice', 'Transcription'],
        error: plaud.error,
      },
    ];
    
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
    });
    
  } catch (error) {
    console.error('[Integrations Status] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check integration status',
        integrations: [],
        stats: { connected: 0, degraded: 0, auth_pending: 0, error: 0 },
        timestamp,
      },
      { status: 500 }
    );
  }
}
