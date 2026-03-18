"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Search,
  Zap,
  User,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_agent_id?: string;
  execution_id?: string;
  created_at: string;
  updated_at: string;
  priority?: string;
  mission_id?: string;
  blocked_reason?: string;
}

const AGENT_NAMES: Record<string, string> = {
  'optimus': 'Optimus', 'henry': 'Henry', 'prime': 'Prime', 'harvey': 'Harvey', 'einstein': 'Einstein', 'olivia': 'Olivia',
};

function getAgentName(agentId?: string): string {
  if (!agentId) return 'Unassigned';
  return AGENT_NAMES[agentId.toLowerCase()] || agentId;
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    executing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [missions, setMissions] = useState<Record<string, { id: string; title: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch tasks
      const tasksRes = await fetch("/api/tasks?limit=200", { cache: 'no-store' });
      if (!tasksRes.ok) {
        throw new Error(`Tasks API error: ${tasksRes.status}`);
      }
      const tasksData = await tasksRes.json();
      
      // Fetch missions (separate try so one failure doesn't break the other)
      let missionMap: Record<string, { id: string; title: string }> = {};
      try {
        const missionsRes = await fetch("/api/missions?limit=100", { cache: 'no-store' });
        if (missionsRes.ok) {
          const missionsData = await missionsRes.json();
          (missionsData.missions || []).forEach((m: any) => {
            missionMap[m.id] = { id: m.id, title: m.title };
          });
        }
      } catch (e) {
        console.log('Missions fetch failed, continuing without mission links');
      }
      
      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
        setMissions(missionMap);
      } else {
        setError(tasksData.error || 'Failed to load tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    
    setDeleting(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        alert('Failed to delete task');
      }
    } catch (err) {
      alert('Error deleting task');
    } finally {
      setDeleting(null);
    }
  }

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAgentName(t.assigned_agent_id).toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const tasksByStatus = tasks.reduce((acc: any, t) => { 
    acc[t.status] = (acc[t.status] || 0) + 1; 
    return acc; 
  }, {});

  const activeExecutions = tasks.filter(t => t.status === 'executing' || t.status === 'in_progress').length;
  const allFilteredSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedTasks.has(t.id));

  function toggleSelectTask(taskId: string) {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    const filteredIds = filteredTasks.map(t => t.id);
    const allSelected = filteredIds.every(id => selectedTasks.has(id));
    
    if (allSelected) {
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }

  async function deleteSelectedTasks() {
    if (selectedTasks.size === 0) return;
    if (!confirm(`Delete ${selectedTasks.size} selected tasks? This cannot be undone.`)) return;

    setBulkDeleting(true);
    const ids = Array.from(selectedTasks);
    const failed: string[] = [];

    for (const taskId of ids) {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (!res.ok) failed.push(taskId);
      } catch (err) {
        failed.push(taskId);
      }
    }

    await loadData();
    setBulkDeleting(false);

    if (failed.length > 0) {
      alert(`Failed to delete ${failed.length} tasks`);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <button className="hover:bg-[#1F2226] p-2 rounded text-white"><ArrowLeft className="w-5 h-5" /></button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Task Operations</h1>
            <p className="text-[#9BA3AF] text-sm">Real-time execution visibility</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeExecutions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm">
              <Zap className="w-4 h-4 animate-pulse" />
              {activeExecutions} executing
            </div>
          )}
          <span className="text-sm text-[#9BA3AF]">{lastRefresh.toLocaleTimeString()}</span>
          <button onClick={loadData} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={loadData} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {selectedTasks.size > 0 && (
        <div className="flex items-center justify-between bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-purple-300 font-medium">{selectedTasks.size} selected</span>
            <button 
              onClick={() => setSelectedTasks(new Set())}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
          <button
            onClick={deleteSelectedTasks}
            disabled={bulkDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm"
          >
            {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Selected
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
          <button onClick={loadData} className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-3">
        {[
          { label: "Total", value: tasks.length },
          { label: "Pending", value: tasksByStatus.pending || 0, color: "text-yellow-400" },
          { label: "Executing", value: tasksByStatus.executing || tasksByStatus.in_progress || 0, color: "text-purple-400" },
          { label: "Blocked", value: tasksByStatus.blocked || 0, color: "text-red-500" },
          { label: "Completed", value: tasksByStatus.completed || 0, color: "text-green-500" },
          { label: "With Agent", value: tasks.filter(t => t.assigned_agent_id).length, color: "text-blue-400" },
          { label: "With Execution", value: tasks.filter(t => t.execution_id).length, color: "text-orange-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <p className="text-[#9BA3AF] text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color || "text-white"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-[#9BA3AF]" />
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks or agents..." 
          className="bg-[#1F2226] border border-[#2A2D32] text-white px-3 py-2 rounded-lg max-w-md" 
        />
      </div>
      
      <div className="bg-[#111214] border border-[#1F2226] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0B0B0C]">
            <tr>
              <th className="px-2 py-2.5 text-left w-10">
                <button 
                  onClick={toggleSelectAll}
                  className="text-[#6B7280] hover:text-white"
                  title={allFilteredSelected ? "Deselect all" : "Select all"}
                >
                  {allFilteredSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase">Task</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-24">Status</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-28">Agent</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-20">Priority</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-32">Mission</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-28">Execution</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-20">Updated</th>
              <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2226]">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="mt-2">Loading tasks...</p>
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'No tasks match your search' : 'No tasks found'}
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={task.id} className={`hover:bg-[#0B0B0C]/50 ${selectedTasks.has(task.id) ? 'bg-purple-900/20' : ''}`}>
                  <td className="px-2 py-3">
                    <button 
                      onClick={() => toggleSelectTask(task.id)}
                      className="text-[#6B7280] hover:text-white"
                    >
                      {selectedTasks.has(task.id) ? <CheckSquare className="w-5 h-5 text-purple-400" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {task.status === 'blocked' && <span className="text-red-500">⚠</span>}
                        {task.status === 'executing' && <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />}
                        <Link href={`/operations/tasks/${task.id}`} className="text-sm font-medium text-white hover:text-[#FF6A00]">
                          {task.title}
                        </Link>
                      </div>
                      <span className="text-[10px] text-[#6B7280] font-mono">{task.id.slice(0, 8)}...</span>
                      {task.blocked_reason && (
                        <span className="text-[10px] text-red-400">Blocker: {task.blocked_reason}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#6B7280]" />
                      <span className={`text-xs ${task.assigned_agent_id ? 'text-white font-medium' : 'text-[#6B7280]'}`}>
                        {getAgentName(task.assigned_agent_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${task.priority === 'critical' ? 'text-[#FF3B30] font-bold' : task.priority === 'high' ? 'text-[#FF6A00]' : 'text-[#9BA3AF]'}`}>
                      {task.priority || 'medium'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.mission_id && missions[task.mission_id] ? (
                      <Link href={`/operations/missions/${task.mission_id}`} className="text-xs text-[#3B82F6] hover:underline truncate block max-w-[120px]">
                        {missions[task.mission_id].title}
                      </Link>
                    ) : (
                      <span className="text-xs text-[#6B7280]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.execution_id ? (
                      <span className="text-[10px] font-mono text-orange-400">
                        {task.execution_id.slice(0, 10)}...
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#6B7280]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#9BA3AF]" title={new Date(task.updated_at).toLocaleString()}>
                      {formatTimeAgo(task.updated_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteTask(task.id)}
                      disabled={deleting === task.id}
                      className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                      title="Delete task"
                    >
                      {deleting === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
