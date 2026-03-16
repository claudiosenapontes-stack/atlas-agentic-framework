'use client';

import { useState, useEffect } from 'react';
import { Calendar, Video, Mail, Mic, Clock, CheckCircle, FileText, ExternalLink } from 'lucide-react';
import { DataStatus } from '@/components/ui/DataStatus';
import Link from 'next/link';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    setEvents([
      { id: '1', title: 'ARQIA Campaign Review', start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(), end_time: new Date(Date.now() + 1000 * 60 * 90).toISOString(), meet_link: 'https://meet.google.com/abc-defg-hij', owner: 'Claudio', type: 'meeting' },
      { id: '2', title: 'Hot Lead Sync', start_time: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), end_time: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), meet_link: 'https://meet.google.com/xyz-1234-abc', owner: 'Sarah Chen', type: 'call' },
    ]);
    setLastSync(new Date().toISOString());
    setLoading(false);
  }, []);

  const nextEvent = events.find(e => new Date(e.start_time) > new Date());
  const timeToNext = nextEvent ? new Date(nextEvent.start_time).getTime() - Date.now() : null;
  const hoursToNext = timeToNext ? Math.floor(timeToNext / (1000 * 60 * 60)) : null;
  const minsToNext = timeToNext ? Math.floor((timeToNext % (1000 * 60 * 60)) / (1000 * 60)) : null;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Calendar className="w-5 h-5 text-indigo-500" /></div>
              <h1 className="text-xl font-semibold">Events Desk</h1>
              <DataStatus source={source} lastSync={lastSync} syncing={loading} />
            </div>
            <p className="text-xs text-[#6B7280]">Executive daily operations for Claudio</p>
          </div>

          {nextEvent && (
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <Clock className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs text-indigo-400">Next: {nextEvent.title}</p>
                <p className="text-sm font-medium text-white">{hoursToNext && hoursToNext > 0 ? `${hoursToNext}h ` : ''}{minsToNext}m</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Today's Schedule" icon={Calendar}>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-[#111214] rounded-lg border border-[#1F2226]">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-500/10 rounded-lg flex flex-col items-center justify-center border border-indigo-500/30">
                    <span className="text-xs text-indigo-400">{new Date(event.start_time).toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-lg font-bold text-indigo-400">{new Date(event.start_time).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1F2226] text-[#9BA3AF] capitalize">{event.type}</span>
                    </div>
                    <p className="text-xs text-[#9BA3AF]">
                      {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.owner}
                    </p>
                    {event.meet_link && (
                      <a href={event.meet_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-green-400 hover:text-green-300">
                        <Video className="w-3 h-3" />Join Google Meet
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Meeting Intelligence" icon={FileText}>
            <div className="p-4 bg-[#111214] rounded-lg border border-[#1F2226]">
              <h4 className="text-sm font-medium text-white">Q1 Marketing Strategy</h4>
              <p className="text-xs text-[#6B7280] mb-2">Plaud.ai • Yesterday</p>
              <p className="text-sm text-[#9BA3AF] mb-3">Reviewed Q1 performance metrics and budget allocation</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase mb-1">Decisions</p>
                  <ul><li className="text-xs text-white flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" />Increase Meta budget 20%</li></ul>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] uppercase mb-1">Actions</p>
                  <ul><li className="text-xs text-white">Update targeting → <Link href="/tasks/task-001" className="text-indigo-400">Task</Link></li></ul>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Voice Commands" icon={Mic}>
            <div className="p-3 bg-[#111214] rounded-lg border border-[#1F2226]">
              <p className="text-sm text-white italic">"Create task to follow up with TechCorp"</p>
              <p className="text-xs text-indigo-400">create_task(subject: TechCorp)</p>
              <p className="text-xs text-[#6B7280]">92% confidence • pending</p>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Watch List" icon={ExternalLink}>
            <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 mb-2">
              <p className="text-sm text-white">ARQIA Renewal Discussion</p>
              <p className="text-xs text-[#6B7280]">meeting • <span className="text-red-400">high</span></p>
            </div>
            <div className="p-3 bg-[#111214] rounded-lg border border-[#1F2226]">
              <p className="text-sm text-white">Unresponded WhatsApp: Michael</p>
              <p className="text-xs text-[#6B7280]">conversation • <span className="text-amber-400">medium</span></p>
            </div>
          </Section>

          <Section title="Today's Delegated" icon={Mail}>
            <div className="p-3 bg-[#111214] rounded-lg border border-[#1F2226] mb-2">
              <p className="text-sm text-white">Schedule demo with TechCorp</p>
              <p className="text-xs text-[#6B7280]">email → Agent Alpha</p>
              <p className="text-xs text-amber-400">in_progress • <Link href="/tasks/task-001" className="text-indigo-400">View →</Link></p>
            </div>
            <div className="p-3 bg-[#111214] rounded-lg border border-[#1F2226]">
              <p className="text-sm text-white">Prepare campaign report</p>
              <p className="text-xs text-[#6B7280]">voice → Agent Beta</p>
              <p className="text-xs text-[#6B7280]">pending</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-[#9BA3AF]" />
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}
