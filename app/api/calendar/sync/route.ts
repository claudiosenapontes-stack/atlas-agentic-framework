import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Google OAuth credentials from environment
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// CACHE_BUST: 9884-REBUILD-FORCE-UPDATE

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
  htmlLink?: string;
  calendarId: string;
  calendarName: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  events: CalendarEvent[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const calendarId = searchParams.get('calendar') || 'primary';
  const daysBack = parseInt(searchParams.get('daysBack') || '7');
  const daysForward = parseInt(searchParams.get('daysForward') || '30');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range
    const now = new Date();
    const timeMin = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000).toISOString();

    // Get stored OAuth tokens from database
    const { data: tokens, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('provider', 'google_calendar')
      .single();

    if (tokenError || !tokens?.access_token) {
      return Response.json(
        {
          success: false,
          error: 'Google Calendar not authenticated. Please run: gog calendar auth',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Create OAuth client
    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : undefined,
    });

    // Create Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];

    // Get calendar metadata
    let calendarName = calendarId === 'primary' ? 'Primary Calendar' : calendarId;
    try {
      const calResponse = await calendar.calendars.get({ calendarId });
      calendarName = calResponse.data.summary || calendarName;
    } catch {
      // Use default name
    }

    // Sync to database
    const result: SyncResult = { synced: 0, skipped: 0, errors: 0, events: [] };

    for (const event of googleEvents) {
      const calendarEventId = event.id!;
      
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('calendar_event_id', calendarEventId)
        .maybeSingle();

      const eventData = {
        calendar_event_id: calendarEventId,
        summary: event.summary || 'Untitled',
        description: event.description || null,
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
        status: event.status || 'confirmed',
        html_link: event.htmlLink || null,
        calendar_id: calendarId,
        calendar_name: calendarName,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('calendar_event_id', calendarEventId);

        if (error) {
          result.errors++;
          console.error('Update error:', error);
        } else {
          result.synced++;
        }
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert({ ...eventData, created_at: new Date().toISOString() });

        if (error) {
          result.errors++;
          console.error('Insert error:', error);
        } else {
          result.synced++;
        }
      }

      result.events.push({
        id: calendarEventId,
        summary: event.summary || 'Untitled',
        description: event.description || undefined,
        start: event.start as any,
        end: event.end as any,
        status: event.status || 'confirmed',
        htmlLink: event.htmlLink || undefined,
        calendarId,
        calendarName,
      });
    }

    return Response.json({
      success: true,
      result,
      timeRange: { timeMin, timeMax },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
