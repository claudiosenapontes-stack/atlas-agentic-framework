'use client';

import { useEffect, useState } from 'react';
import { User, Pause, Share2, Bell, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditEvent {
  id: string;
  event_type: 'claimed' | 'deferred' | 'delegated' | 'notification_sent' | 'task_created' | 'status_changed';
  actor_name?: string;
  target_name?: string;
  payload: Record<string, any>;
  created_at: string;
}

interface ActionAuditTrailProps {
  taskId: string;
  refreshInterval?: number;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  claimed: {
    icon: <User className="w-4 h-4" />,
    color: 'bg-green-500/10 text-green-400 border-green-500/30',
    label: 'Claimed',
  },
  deferred: {
    icon: <Pause className="w-4 h-4" />,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    label: 'Deferred',
  },
  delegated: {
    icon: <Share2 className="w-4 h-4" />,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    label: 'Delegated',
  },
  notification_sent: {
    icon: <Bell className="w-4 h-4" />,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    label: 'Notification Sent',
  },
  task_created: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-gray-700 text-gray-400 border-gray-600',
    label: 'Created',
  },
  status_changed: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-gray-700 text-gray-400 border-gray-600',
    label: 'Status Changed',
  },
};

export function ActionAuditTrail({ taskId, refreshInterval = 5000 }: ActionAuditTrailProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditTrail = async () => {
    try {
      // Fetch from execution_events filtered by task_id in payload
      const response = await fetch(`/api/executions?taskId=${taskId}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      
      const data = await response.json();
      
      // Filter events related to this task
      const taskEvents = (data.events || []).filter((event: any) => {
        const payload = event.payload || {};
        return payload.task_id === taskId || event.task_id === taskId;
      });

      // Map to audit events
      const mappedEvents: AuditEvent[] = taskEvents.map((event: any) => ({
        id: event.id,
        event_type: mapEventType(event.event_type),
        actor_name: event.actor_name || event.agent_id,
        target_name: event.target_name,
        payload: event.payload || {},
        created_at: event.created_at,
      }));

      setEvents(mappedEvents);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mapEventType = (type: string): AuditEvent['event_type'] => {
    if (type.includes('claim')) return 'claimed';
    if (type.includes('defer')) return 'deferred';
    if (type.includes('delegate')) return 'delegated';
    if (type.includes('notification')) return 'notification_sent';
    if (type.includes('create')) return 'task_created';
    return 'status_changed';
  };

  useEffect(() => {
    fetchAuditTrail();
    const interval = setInterval(fetchAuditTrail, refreshInterval);
    return () => clearInterval(interval);
  }, [taskId, refreshInterval]);

  const renderEventDetails = (event: AuditEvent) => {
    switch (event.event_type) {
      case 'claimed':
        return (
          <span className="text-gray-400">
            by <span className="text-white">{event.actor_name || 'Unknown'}</span>
          </span>
        );
      case 'deferred':
        return (
          <span className="text-gray-400">
            Reason: <span className="text-white">{event.payload.reason || 'No reason'}</span>
          </span>
        );
      case 'delegated':
        return (
          <span className="text-gray-400">
            to <span className="text-white">{event.target_name || event.payload.target_agent_id || 'Unknown'}</span>
          </span>
        );
      case 'notification_sent':
        return (
          <span className="text-gray-400">
            {event.payload.type || 'Notification'} • {event.payload.channels?.join(', ') || 'in_app'}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading audit trail...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Error loading audit trail: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-400" />
        Action Audit Trail
      </h2>
      
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">No audit events yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.status_changed;
            
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg"
              >
                <div className={`flex-shrink-0 p-2 rounded-lg border ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(event.created_at))} ago
                    </span>
                  </div>
                  <div className="text-sm mt-0.5">
                    {renderEventDetails(event)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
