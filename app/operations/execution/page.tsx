'use client';

import { useState, useEffect } from 'react';
import { 
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  User,
  Calendar
} from 'lucide-react';

interface Execution {
  id: string;
  task_id: string;
  agent_id: string | null;
  status: 'queued' | 'executing' | 'completed' | 'failed' | 'blocked';
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress_pct: number;
  attempt_number: number;
  retry_count: number;
}

interface Task {
  id: string;
  title: string;
  assigned_agent_id: string | null;
  status: string;
}

const STATUS_COLORS = {
  queued: 'bg-blue-100 text-blue-800 border-blue-300',
  executing: 'bg-yellow-100 text-yellow-800 border-yellow-300 animate-pulse',
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  blocked: 'bg-gray-100 text-gray-800 border-gray-300',
};

const STATUS_ICONS = {
  queued: Clock,
  executing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  blocked: AlertCircle,
};

export default function ExecutionPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchExecutions() {
    try {
      setLoading(true);
      const res = await fetch('/api/executions', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.success) {
        setExecutions(data.executions || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch executions');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.tasks) {
        const taskMap: Record<string, Task> = {};
        data.tasks.forEach((t: Task) => { taskMap[t.id] = t; });
        setTasks(taskMap);
      }
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    fetchExecutions();
    fetchTasks();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchExecutions();
      fetchTasks();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: executions.length,
    queued: executions.filter(e => e.status === 'queued').length,
    executing: executions.filter(e => e.status === 'executing').length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    blocked: executions.filter(e => e.status === 'blocked').length,
  };

  function formatDuration(start: string | null, end: string | null): string {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = Math.floor((endTime - startTime) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Execution Monitor
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time task execution tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { fetchExecutions(); fetchTasks(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Queued" value={stats.queued} color="blue" />
        <StatCard label="Executing" value={stats.executing} color="yellow" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Failed" value={stats.failed} color="red" />
        <StatCard label="Blocked" value={stats.blocked} color="gray" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* Executions Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            Active Executions
          </h2>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1A1A1A]">
              <tr className="text-left text-sm text-gray-400 border-b border-[#2A2A2A]">
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Task</th>
                <th className="px-6 py-3 font-medium">Agent</th>
                <th className="px-6 py-3 font-medium">Progress</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Attempt</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading executions...' : 'No executions found'}
                  </td>
                </tr>
              ) : (
                executions.map((execution) => {
                  const task = tasks[execution.task_id];
                  const StatusIcon = STATUS_ICONS[execution.status] || Clock;
                  
                  return (
                    <tr key={execution.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[execution.status]}`}>
                          <StatusIcon className={`w-3 h-3 ${execution.status === 'executing' ? 'animate-spin' : ''}`} />
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {task?.title || `Task ${execution.task_id.slice(0, 8)}...`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {execution.task_id.slice(0, 16)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="w-4 h-4 text-gray-500" />
                          {execution.agent_id?.slice(0, 8) || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${execution.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {execution.progress_pct}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {formatDuration(execution.started_at, execution.completed_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">
                          #{execution.attempt_number}
                          {execution.retry_count > 0 && (
                            <span className="text-yellow-500 ml-1">
                              (retry {execution.retry_count})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(execution.created_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    gray: 'bg-gray-800 border-gray-700',
    blue: 'bg-blue-900/20 border-blue-700',
    yellow: 'bg-yellow-900/20 border-yellow-700',
    green: 'bg-green-900/20 border-green-700',
    red: 'bg-red-900/20 border-red-700',
  };
  
  const valueClasses = {
    gray: 'text-gray-300',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className={`text-2xl font-bold ${valueClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
