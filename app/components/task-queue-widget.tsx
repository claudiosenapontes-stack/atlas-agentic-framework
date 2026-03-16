'use client';

import { useState, useEffect } from 'react';
import { ListTodo, Clock, AlertCircle, Play, CheckCircle, Pause } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_agent_id: string | null;
  created_at: string;
  company_id: string;
}

interface TaskQueueWidgetProps {
  maxItems?: number;
  refreshInterval?: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  inbox: { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700', label: 'Inbox' },
  draft: { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700', label: 'Draft' },
  pending_approval: { icon: <Pause className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  claimed: { icon: <Play className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700', label: 'Claimed' },
  in_progress: { icon: <Play className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  blocked: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700', label: 'Blocked' },
  completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-700', label: 'Done' },
  failed: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700', label: 'Failed' },
  canceled: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700', label: 'Canceled' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-amber-500',
  urgent: 'text-red-500',
};

export function TaskQueueWidget({ maxItems = 10, refreshInterval = 5000 }: TaskQueueWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('active');

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.tasks || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    const interval = setInterval(fetchTasks, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return !['completed', 'canceled', 'failed', 'archived'].includes(task.status);
    }
    if (filter === 'pending') return ['inbox', 'draft', 'pending_approval'].includes(task.status);
    if (filter === 'running') return ['claimed', 'in_progress'].includes(task.status);
    if (filter === 'blocked') return task.status === 'blocked' || task.status === 'failed';
    return true;
  });

  const sortedTasks = filteredTasks.sort((a, b) => {
    // Priority order: urgent > high > medium > low
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const displayTasks = sortedTasks.slice(0, maxItems);
  
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = tasks.filter(t => 
    !['completed', 'canceled', 'failed', 'archived'].includes(t.status)
  ).length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <ListTodo className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-800">Task Queue</h2>
        </div>
        <div className="flex items-center justify-center h-32 text-slate-400">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">Tasks</h2>
            <span className="text-sm text-slate-500">({activeCount})</span>
          </div>
          
          <Link
            href="/operations/tasks"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            All →
          </Link>
        </div>
        
        <div className="flex gap-1 mt-2">
          {['active', 'pending', 'running', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-xs rounded capitalize ${
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 text-red-600 text-sm">Error: {error}</div>
      ) : displayTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          No tasks
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {displayTasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.inbox;
              
              return (
                <Link
                  key={task.id}
                  href={`/operations/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className={`p-1.5 rounded ${statusConfig.color}`}>
                    {statusConfig.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {task.assigned_agent_id || 'Unassigned'}
                      </span>
                      <span className={`text-xs ${PRIORITY_COLORS[task.priority] || 'text-gray-400'}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
