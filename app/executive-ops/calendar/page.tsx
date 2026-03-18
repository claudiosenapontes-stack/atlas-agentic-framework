'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface CalendarEvent {
  id: string;
  calendar_event_id: string;
  summary: string;
  description?: string;
  start_time: string;
  end_time?: string;
  status: string;
  html_link?: string;
  calendar_id: string;
  calendar_name: string;
  created_at: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    console.log('[Calendar] Fetching events...');
    try {
      const response = await fetch('/api/calendar/events?limit=50', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      console.log('[Calendar] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Calendar] Response data:', { success: data.success, count: data.events?.length });
      
      if (data.success) {
        setEvents(data.events || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('[Calendar] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function syncCalendar() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/calendar/sync?daysBack=7&daysForward=30');
      const data = await response.json();
      if (data.success) {
        setSyncResult(data.result);
        await fetchEvents();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync error');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isUpcoming(event: CalendarEvent): boolean {
    return new Date(event.start_time) > new Date();
  }

  function isToday(event: CalendarEvent): boolean {
    const eventDate = new Date(event.start_time);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            Calendar Integration
          </h1>
          <p className="text-slate-400 mt-1">
            Sync and manage Google Calendar events
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={syncCalendar}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Calendar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {syncResult && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-green-300">Sync Complete</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Synced:</span>{' '}
              <span className="text-green-400 font-semibold">{syncResult.synced}</span>
            </div>
            <div>
              <span className="text-slate-400">Skipped:</span>{' '}
              <span className="text-yellow-400 font-semibold">{syncResult.skipped}</span>
            </div>
            <div>
              <span className="text-slate-400">Errors:</span>{' '}
              <span className="text-red-400 font-semibold">{syncResult.errors}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="text-3xl font-bold text-blue-400">{events.length}</div>
          <div className="text-sm text-slate-400">Total Events</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="text-3xl font-bold text-green-400">
            {events.filter(isToday).length}
          </div>
          <div className="text-sm text-slate-400">Today</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="text-3xl font-bold text-purple-400">
            {events.filter(isUpcoming).length}
          </div>
          <div className="text-sm text-slate-400">Upcoming</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="text-3xl font-bold text-orange-400">
            {new Set(events.map(e => e.calendar_id)).size}
          </div>
          <div className="text-sm text-slate-400">Calendars</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-semibold">Calendar Events</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
            Loading events...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
            <p className="text-red-300 mb-2">Failed to load events</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-4" />
            No events found. Click "Sync Calendar" to import.
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {events.map(event => (
              <div
                key={event.id}
                className={`p-4 hover:bg-slate-700/50 transition-colors ${
                  isToday(event) ? 'bg-blue-900/20 border-l-4 border-blue-400' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200">{event.summary}</h3>
                      {isToday(event) && (
                        <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-full">
                          Today
                        </span>
                      )}
                      {isUpcoming(event) && !isToday(event) && (
                        <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full">
                          Upcoming
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(event.start_time)}
                        {event.end_time && ` - ${formatDate(event.end_time)}`}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">{event.calendar_name}</span>
                    </div>
                  </div>
                  {event.html_link && (
                    <a
                      href={event.html_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Open in Google Calendar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
