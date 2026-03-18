'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Users,
  Video,
  MapPin,
  AlertCircle,
  Plus,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  meetLink?: string;
  attendees: string[];
  isRecurring: boolean;
  eventType: 'virtual' | 'in_person' | 'hybrid';
  confirmed: boolean;
  description?: string;
}

interface CalendarToday {
  connected: boolean;
  events: CalendarEvent[];
  freeSlots: TimeBlock[];
  nextEvent?: CalendarEvent;
}

interface TimeBlock {
  start: string;
  end: string;
}

async function getCalendarToday(): Promise<CalendarToday | null> {
  try {
    const res = await fetch('/api/calendar/today', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch calendar');
    return await res.json();
  } catch {
    return null;
  }
}

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<CalendarToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getCalendarToday().then(data => {
      setCalendar(data);
      setLoading(false);
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isPast = (isoString: string) => {
    return new Date(isoString) < currentTime;
  };

  const isCurrent = (start: string, end: string) => {
    const now = currentTime.getTime();
    return new Date(start).getTime() <= now && new Date(end).getTime() >= now;
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Calendar & Meetings</h1>
              <p className="text-sm text-[#6B7280]">Schedule & availability</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                getCalendarToday().then(data => {
                  setCalendar(data);
                  setLoading(false);
                });
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#6B7280] hover:text-white hover:border-[#6B7280] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#FF6A00] hover:bg-[#FF8533] text-white rounded-lg text-xs transition-colors">
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Status */}
        {calendar && !calendar.connected && (
          <div className="mb-6 p-4 bg-[#1F2226] border border-[#FFB020]/30 rounded-[10px]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FFB020]" />
              <span className="text-sm text-white">Calendar not connected</span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">Connect your Google Calendar to see events and availability.</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
            <span className="ml-2 text-[#6B7280]">Loading calendar...</span>
          </div>
        ) : calendar?.events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Calendar className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No events today</p>
            <p className="text-xs text-[#6B7280] mt-1">Your calendar is clear</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calendar?.events.map((event) => {
              const past = isPast(event.end);
              const current = isCurrent(event.start, event.end);
              
              return (
                <div
                  key={event.id}
                  className={`p-4 border rounded-[10px] transition-all ${
                    current
                      ? 'bg-[#16C784]/5 border-[#16C784]/30'
                      : past
                      ? 'bg-[#111214]/50 border-[#1F2226] opacity-60'
                      : 'bg-[#111214] border-[#1F2226] hover:border-[#6B7280]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {current && (
                          <span className="px-2 py-0.5 bg-[#16C784]/20 text-[#16C784] text-xs rounded-full">
                            Now
                          </span>
                        )}
                        {event.isRecurring && (
                          <span className="text-[#6B7280]">
                            <Clock className="w-3 h-3" />
                          </span>
                        )}
                        <h3 className={`font-medium ${past ? 'text-[#9BA3AF]' : 'text-white'}`}>
                          {event.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-[#6B7280]">
                          {formatTime(event.start)} - {formatTime(event.end)} ({formatDuration(event.start, event.end)})
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-[#6B7280]">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[#6B7280]">
                          <Users className="w-3 h-3" />
                          {event.attendees.length} attendees
                        </span>
                      </div>
                      </div>
                    <div className="flex items-center gap-2">
                      {event.meetLink && (
                        <a
                          href={event.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#3B82F6]/20 text-[#3B82F6] text-xs rounded-lg hover:bg-[#3B82F6]/30 transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join
                        </a>
                      )}
                      {!event.confirmed && !past && (
                        <span className="px-2 py-1 bg-[#FFB020]/20 text-[#FFB020] text-xs rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Free Slots */}
        {calendar && calendar.freeSlots.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-white mb-3">Available Slots</h2>
            <div className="flex flex-wrap gap-2">
              {calendar.freeSlots.map((slot, idx) => (
                <button
                  key={idx}
                  className="px-3 py-1.5 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:border-[#16C784] hover:text-[#16C784] transition-colors"
                >
                  {formatTime(slot.start)} - {formatTime(slot.end)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
