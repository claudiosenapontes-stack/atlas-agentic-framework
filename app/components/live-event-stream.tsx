'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Pause, Play, Filter, XCircle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Event {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  severity: 'info' | 'success' | 'warning' | 'error';
}

interface LiveEventStreamProps {
  maxEvents?: number;
  companyId?: string;
}

// System-compliant colors only - NO blue/purple
const EVENT_COLORS: Record<string, string> = {
  'task.created': 'text-[#9BA3AF]',
  'task.completed': 'text-[#16C784]',
  'task.failed': 'text-[#FF3B30]',
  'task.blocked': 'text-[#FFB020]',
  'agent.online': 'text-[#16C784]',
  'agent.offline': 'text-[#FF3B30]',
  'command.executed': 'text-[#9BA3AF]',
  'error': 'text-[#FF3B30]',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'task.created': <Info className="w-3.5 h-3.5" />,
  'task.completed': <CheckCircle className="w-3.5 h-3.5" />,
  'task.failed': <XCircle className="w-3.5 h-3.5" />,
  'task.blocked': <AlertCircle className="w-3.5 h-3.5" />,
  'agent.online': <CheckCircle className="w-3.5 h-3.5" />,
  'agent.offline': <XCircle className="w-3.5 h-3.5" />,
  'command.executed': <Info className="w-3.5 h-3.5" />,
  'error': <XCircle className="w-3.5 h-3.5" />,
};

export function LiveEventStream({ maxEvents = 100, companyId }: LiveEventStreamProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL('/api/stream/events', window.location.origin);
    if (companyId) url.searchParams.set('companyId', companyId);

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    es.onmessage = (e) => {
      if (isPaused) return;

      try {
        const data = JSON.parse(e.data);
        
        // Handle different event types from SSE
        if (data.event === 'connected') {
          return; // Skip connection events
        }

        // Handle batch events
        if (data.event === 'events:batch' && data.data?.events) {
          const newEvents: Event[] = [];
          
          Object.entries(data.data.events).forEach(([type, eventList]: [string, any]) => {
            if (Array.isArray(eventList)) {
              eventList.forEach((evt: any) => {
                newEvents.push({
                  id: evt.id || Math.random().toString(36).substring(7),
                  type: evt.event_type || type,
                  timestamp: new Date(evt.created_at || Date.now()),
                  data: evt,
                  severity: getSeverity(evt.event_type || type, evt.severity),
                });
              });
            }
          });

          setEvents((prev) => {
            const combined = [...newEvents, ...prev];
            return combined.slice(0, maxEvents);
          });
        }

        // Handle agent status updates
        if (data.event === 'agent:status' && data.data?.agents) {
          data.data.agents.forEach((agent: any) => {
            setEvents((prev) => [
              {
                id: `agent-${agent.name}-${Date.now()}`,
                type: `agent.${agent.status}`,
                timestamp: new Date(),
                data: agent,
                severity: agent.status === 'online' ? 'success' : 'warning',
              },
              ...prev.slice(0, maxEvents - 1),
            ]);
          });
        }

        // Handle task updates
        if (data.event === 'task:updates' && data.data?.tasks) {
          data.data.tasks.forEach((task: any) => {
            setEvents((prev) => [
              {
                id: `task-${task.id}-${Date.now()}`,
                type: `task.${task.status}`,
                timestamp: new Date(),
                data: task,
                severity: getTaskSeverity(task.status),
              },
              ...prev.slice(0, maxEvents - 1),
            ]);
          });
        }
      } catch (err) {
        console.error('[LiveEventStream] Failed to parse event:', err);
      }
    };
  }, [companyId, isPaused, maxEvents]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current && !isPaused) {
      containerRef.current.scrollTop = 0;
    }
  }, [events, isPaused]);

  const getSeverity = (type: string, severity?: string): Event['severity'] => {
    if (severity) return severity as Event['severity'];
    if (type?.includes('error') || type?.includes('failed')) return 'error';
    if (type?.includes('blocked')) return 'warning';
    if (type?.includes('completed') || type?.includes('success')) return 'success';
    return 'info';
  };

  const getTaskSeverity = (status: string): Event['severity'] => {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'blocked') return 'warning';
    return 'info';
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return e.type.startsWith('task.');
    if (filter === 'agents') return e.type.startsWith('agent.');
    if (filter === 'errors') return e.severity === 'error' || e.severity === 'warning';
    return true;
  });

  const formatEventMessage = (event: Event): string => {
    const { type, data } = event;
    
    if (type.startsWith('agent.')) {
      const agentName = data.display_name || data.name || 'Unknown';
      return `${agentName}: ${data.status}`;
    }
    
    if (type.startsWith('task.')) {
      const taskTitle = data.title || data.task_title || 'Task';
      return `${taskTitle} (${data.status || 'updated'})`;
    }
    
    if (type === 'command.executed') {
      return `Command: ${data.command_text?.slice(0, 50) || 'Unknown'}`;
    }
    
    return `${type}: ${JSON.stringify(data).slice(0, 50)}`;
  };

  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#9BA3AF]" />
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase">Events</h2>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-[#16C784] animate-pulse' : 'bg-[#FF3B30]'
            }`}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[10px] bg-[#0B0B0C] border border-[#1F2226] rounded px-2 py-1 text-[#9BA3AF]"
          >
            <option value="all">All</option>
            <option value="tasks">Tasks</option>
            <option value="agents">Agents</option>
            <option value="errors">Errors</option>
          </select>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded transition-colors ${
              isPaused ? 'bg-[#FFB020]/10 text-[#FFB020]' : 'bg-[#1F2226] text-[#6B7280] hover:text-[#9BA3AF]'
            }`}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#6B7280]">
            No events
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 p-2 rounded hover:bg-[#0B0B0C] transition-colors"
            >
              <span className={`${EVENT_COLORS[event.type] || 'text-[#6B7280]'} mt-0.5`}>
                {EVENT_ICONS[event.type] || EVENT_ICONS['info']}
              </span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B7280]">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`text-[10px] font-medium ${EVENT_COLORS[event.type] || 'text-[#6B7280]'}`}>
                    {event.type}
                  </span>
                </div>
                <p className="text-[#9BA3AF] truncate">{formatEventMessage(event)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="px-3 py-2 border-t border-[#1F2226] text-[10px] text-[#6B7280] flex justify-between shrink-0">
        <span>{filteredEvents.length} events</span>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
}
