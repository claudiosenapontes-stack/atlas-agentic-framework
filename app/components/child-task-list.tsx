'use client';

import { useState, useEffect } from 'react';
import { ListTodo, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, Clock, Loader2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface ChildTask {
  id: string;
  title: string;
  status: string;
  assigned_agent_id: string | null;
  delegated_at: string;
  priority: string;
}

interface ChildTaskListProps {
  parentTaskId: string;
  maxItems?: number;
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

export function ChildTaskList({ parentTaskId, maxItems = 5, refreshInterval = 5000 }: ChildTaskListProps) {
  const [children, setChildren] = useState<ChildTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async () => {
    try {
      // Filter client-side until API supports parent_task_id query
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch child tasks');
      
      const data = await response.json();
      const childTasks = (data.tasks || [])
        .filter((t: any) => t.parent_task_id === parentTaskId)
        .slice(0, maxItems);
      
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
  }, [refreshInterval, parentTaskId, maxItems]);

  const completedCount = children.filter(c => c.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="bg-violet-50 rounded-lg border border-violet-200 p-3">
        <div className="flex items-center gap-2 text-violet-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading sub-tasks...</span>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2 text-slate-500">
          <ListTodo className="w-4 h-4" />
          <span className="text-sm">No delegated sub-tasks yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-violet-50 rounded-lg border border-violet-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-violet-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-violet-700" />
          <span className="font-medium text-violet-900">Child Tasks</span>
          <span className="text-sm text-violet-600">({children.length})</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
            {completedCount} done
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-400" />}
      </button>

      {isExpanded && (
        <div className="border-t border-violet-200">
          {error ? (
            <div className="p-3 text-red-600 text-sm">Error: {error}</div>
          ) : (
            <div className="divide-y divide-violet-100 max-h-60 overflow-y-auto">
              {children.map((child) => {
                const statusConfig = STATUS_CONFIG[child.status] || STATUS_CONFIG.inbox;
                
                return (
                  <Link
                    key={child.id}
                    href={`/operations/tasks/${child.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-violet-100/50 transition-colors"
                  >
                    <div className={`p-1 rounded ${statusConfig.color}`}>
                      {statusConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-violet-900 truncate">
                        {child.title}
                      </p>
                      {child.assigned_agent_id && (
                        <span className="text-xs text-violet-600">
                          → {child.assigned_agent_id}
                        </span>
                      )}
                    </div>
                    
                    <ArrowUpRight className="w-3 h-3 text-violet-400" />
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
