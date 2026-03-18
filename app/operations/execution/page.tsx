'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Zap
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
  updated_at: string;
  progress_pct: number;
}

interface Task {
  id: string;
  title: string;
  assigned_agent_id: string | null;
  status: string;
}

const AGENT_NAMES: Record<string, string> = {
  'optimus': 'Optimus', 'henry': 'Henry', 'prime': 'Prime', 
  'harvey': 'Harvey', 'einstein': 'Einstein', 'olivia': 'Olivia',
};

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  executing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  blocked: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function getAgentName(agentId?: string | null): string {
  if (!agentId) return 'Unassigned';
  return AGENT_NAMES[agentId.toLowerCase()] || agentId.slice(0, 8);
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '-';
  const diff = Math.floor((new Date(end || Date.now()).getTime() - new Date(start).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

export default function ExecutionPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchData() {
    try {
      setLoading(true);
      const [execRes, tasksRes] = await Promise.all([
        fetch('/api/executions?limit=100', { cache: 'no-store' }),
        fetch('/api/tasks?limit=200', { cache: 'no-store' }),
      ]);
      
      const execData = await execRes.json();
      const tasksData = await tasksRes.json();
      
      if (execData.success) setExecutions(execData.executions || []);
      if (tasksData.success) {
        const taskMap: Record<string, Task> = {};
        tasksData.tasks.forEach((t: Task) => { taskMap[t.id] = t; });
        setTasks(taskMap);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
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

  const activeExecutions = executions.filter(e => e.status === 'executing');

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-500" />
            Execution Monitor
          </h1>
          <p className="text-gray-400 mt-1">Real-time execution tracking — see who is doing what</p>
        </div>
        <div className="flex items-center gap-4">
          {activeExecutions.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm">
              <Zap className="w-4 h-4 animate-pulse" />
              {activeExecutions.length} active
            </div>
          )}
          <span className="text-sm text-gray-400">{lastRefresh.toLocaleTimeString()}</span>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Queued" value={stats.queued} color="blue" />
        <StatCard label="Executing" value={stats.executing} color="purple" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Failed" value={stats.failed} color="red" />
        <StatCard label="Blocked" value={stats.blocked} color="gray" />
      </div>

      {activeExecutions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" /> Currently Executing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeExecutions.map((execution) => {
              const task = tasks[execution.task_id];
              return (
                <div key={execution.id} className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Link href={`/operations/tasks/${execution.task_id}`} className="text-white font-medium hover:text-purple-400">
                        {task?.title || 'Unknown Task'}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDuration(execution.started_at, null)} running</p>
                    </div>
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-white font-medium">{getAgentName(execution.agent_id || task?.assigned_agent_id)}</span>
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${execution.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{execution.progress_pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Play className="w-5 h-5 text-blue-400" /> All Executions</h2>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
        </div>
        
        <table className="w-full">
          <thead className="bg-[#0B0B0C]">
            <tr className="text-left text-[10px] text-[#6B7280] uppercase">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Last Update</th>
              <th className="px-4 py-3">Result/Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {executions.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">{loading ? 'Loading...' : 'No executions'}</td></tr>
            ) : (
              executions.map((execution) => {
                const task = tasks[execution.task_id];
                const StatusIcon = execution.status === 'executing' ? Loader2 : 
                  execution.status === 'completed' ? CheckCircle2 :
                  execution.status === 'failed' ? XCircle :
                  execution.status === 'blocked' ? AlertCircle : Clock;
                
                return (
                  <tr key={execution.id} className="hover:bg-[#252525]">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${STATUS_COLORS[execution.status]}`}>
                        <StatusIcon className={`w-3 h-3 ${execution.status === 'executing' ? 'animate-spin' : ''}`} />
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/operations/tasks/${execution.task_id}`} className="text-sm font-medium text-white hover:text-purple-400">
                        {task?.title || `Task ${execution.task_id.slice(0, 8)}...`}
                      </Link>
                      <div className="text-[10px] text-gray-500 font-mono">{execution.task_id.slice(0, 12)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className={`text-xs ${execution.agent_id || task?.assigned_agent_id ? 'text-white font-medium' : 'text-gray-500'}`}>
                          {getAgentName(execution.agent_id || task?.assigned_agent_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${execution.status === 'executing' ? 'bg-purple-500' : 'bg-blue-500'}`} style={{ width: `${execution.progress_pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{execution.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{formatDuration(execution.started_at, execution.completed_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatTimeAgo(execution.updated_at)}</td>
                    <td className="px-4 py-3">
                      {execution.error_message ? (
                        <span className="text-xs text-red-400 truncate max-w-[150px] block" title={execution.error_message}>{execution.error_message.slice(0, 30)}...</span>
                      ) : execution.result_summary ? (
                        <span className="text-xs text-green-400 truncate max-w-[150px] block">{execution.result_summary.slice(0, 30)}...</span>
                      ) : (<span className="text-xs text-gray-500">—</span>)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, {bg: string, text: string}> = {
    gray: {bg: 'bg-gray-800 border-gray-700', text: 'text-gray-300'},
    blue: {bg: 'bg-blue-900/20 border-blue-700', text: 'text-blue-400'},
    purple: {bg: 'bg-purple-900/20 border-purple-700', text: 'text-purple-400'},
    green: {bg: 'bg-green-900/20 border-green-700', text: 'text-green-400'},
    red: {bg: 'bg-red-900/20 border-red-700', text: 'text-red-400'},
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color].bg}`}>
      <div className={`text-2xl font-bold ${colors[color].text}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
