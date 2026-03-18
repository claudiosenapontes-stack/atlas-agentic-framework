import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

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

    // Fetch events from Google Calendar using gog CLI
    const { stdout, stderr } = await execAsync(
      `cd /root/.openclaw/workspaces/atlas-agentic-framework && gcal events --calendar="${calendarId}" --max=100 2>&1`
    );

    if (stderr && !stdout) {
      throw new Error(`Failed to fetch calendar events: ${stderr}`);
    }

    // Parse gcal output
    let googleEvents: any[] = [];
    try {
      const lines = stdout.trim().split('\n');
      const jsonLine = lines.find(l => l.trim().startsWith('{') || l.trim().startsWith('['));
      if (jsonLine) {
        const parsed = JSON.parse(jsonLine);
        googleEvents = parsed.items || parsed || [];
      }
    } catch (e) {
      // Fallback: try to parse as JSON directly
      try {
        const parsed = JSON.parse(stdout);
        googleEvents = parsed.items || [];
      } catch {
        googleEvents = [];
      }
    }

    // Filter events by date range
    const filteredEvents = googleEvents.filter((event: any) => {
      const eventStart = event.start?.dateTime || event.start?.date;
      if (!eventStart) return false;
      return eventStart >= timeMin && eventStart <= timeMax;
    });

    // Get calendar name
    let calendarName = calendarId === 'primary' ? 'Primary Calendar' : calendarId;
    try {
      const { stdout: calStdout } = await execAsync(
        `cd /root/.openclaw/workspaces/atlas-agentic-framework && gcal list 2>&1 | grep -A1 -B1 "${calendarId}" | head -3`
      );
      const summaryMatch = calStdout.match(/"summary":\s*"([^"]+)"/);
      if (summaryMatch) calendarName = summaryMatch[1];
    } catch {
      // Use default name
    }

    // Sync to database
    const result: SyncResult = { synced: 0, skipped: 0, errors: 0, events: [] };

    for (const event of filteredEvents) {
      const calendarEventId = event.id;
      const existing = await supabase
        .from('calendar_events')
        .select('id')
        .eq('calendar_event_id', calendarEventId)
        .single();

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

      if (existing.data) {
        // Update existing
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
        // Insert new
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
        description: event.description,
        start: event.start,
        end: event.end,
        status: event.status,
        htmlLink: event.htmlLink,
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
