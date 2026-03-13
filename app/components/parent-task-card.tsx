'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DelegatedTask {
  id: string;
  title: string;
  status: string;
  assigned_agent_id: string | null;
  delegated_by: string | null;
  delegated_at: string;
  priority: string;
}

interface ParentTaskCardProps {
  taskId: string;
  refreshInterval?: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  inbox: { icon: <Clock className="w-3 h-3" />, color: 'bg-slate-100 text-slate-600', label: 'Inbox' },
  draft: { icon: <Clock className="w-3 h-3" />, color: 'bg-slate-100 text-slate-600', label: 'Draft' },
  pending_approval: { icon: <Clock className="w-3 h-3" />, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  claimed: { icon: <Play className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700', label: 'Claimed' },
  in_progress: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'bg-blue-100 text-blue-700', label: 'Running' },
  blocked: { icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-700', label: 'Blocked' },
  completed: { icon: <CheckCircle className="w-3 h-3" />, color: 'bg-green-100 text-green-700', label: 'Done' },
  failed: { icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-700', label: 'Failed' },
};

export function ParentTaskCard({ taskId, refreshInterval = 5000 }: ParentTaskCardProps) {
  const [children, setChildren] = useState<DelegatedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async () => {
    try {
      // For now, fetch all tasks and filter client-side
      // In production, use: /api/tasks?parent_task_id=${taskId}
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch child tasks');
      
      const data = await response.json();
      // Filter tasks with this task as parent (until API supports query param)
      const childTasks = (data.tasks || []).filter((t: any) => t.parent_task_id === taskId);
      setChildren(childTasks);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    const interval = setInterval(fetchChildren, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, taskId]);

  const completedCount = children.filter(c => c.status === 'completed').length;
  const progress = children.length > 0 ? Math.round((completedCount / children.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading delegation...</span>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return null; // Don't show if no children
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-600" />
          <span className="font-medium text-slate-800">Delegated Tasks</span>
          <span className="text-sm text-slate-500">({children.length})</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
            {completedCount}/{children.length} done
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {error ? (
            <div className="p-3 text-red-600 text-sm">Error: {error}</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {children.map((child) => {
                const statusConfig = STATUS_CONFIG[child.status] || STATUS_CONFIG.inbox;
                
                return (
                  <Link
                    key={child.id}
                    href={`/tasks/${child.id}`}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-1 rounded ${statusConfig.color}`}>
                      {statusConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {child.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {child.assigned_agent_id || 'Unassigned'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {child.delegated_at && new Date(child.delegated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
