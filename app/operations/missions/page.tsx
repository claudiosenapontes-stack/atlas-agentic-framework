'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Zap,
  Trash2
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'queued' | 'in_progress' | 'complete' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_agent_id: string | null;
  child_task_count: number;
  completed_task_count: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  blocker_reason: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_agent_id: string | null;
  mission_id: string | null;
  execution_id?: string;
  updated_at: string;
  priority?: string;
}

const AGENT_NAMES: Record<string, string> = {
  'optimus': 'Optimus', 'henry': 'Henry', 'prime': 'Prime', 'harvey': 'Harvey', 'einstein': 'Einstein', 'olivia': 'Olivia',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  executing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  complete: 'bg-green-500/20 text-green-400 border-green-500/30',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getAgentName(agentId?: string | null): string {
  if (!agentId) return 'Unassigned';
  return AGENT_NAMES[agentId.toLowerCase()] || agentId;
}

function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    executing: 'bg-purple-500',
    completed: 'bg-green-500',
    blocked: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [missionTasks, setMissionTasks] = useState<Record<string, Task[]>>({});

  async function fetchData() {
    try {
      setLoading(true);
      const missionsRes = await fetch('/api/missions?limit=100', { cache: 'no-store' });
      
      if (!missionsRes.ok) throw new Error(`Missions API error: ${missionsRes.status}`);
      
      const missionsData = await missionsRes.json();
      if (missionsData.success) {
        const missions = missionsData.missions || [];
        setMissions(missions);
        
        // Pre-fetch tasks for all missions on load
        if (missions.length > 0) {
          fetchAllMissionTasks(missions.map((m: Mission) => m.id));
        }
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }
  
  async function fetchAllMissionTasks(missionIds: string[]) {
    try {
      const res = await fetch(`/api/tasks?limit=200`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Group tasks by mission_id
        const tasksByMission: Record<string, Task[]> = {};
        for (const task of (data.tasks || [])) {
          if (task.mission_id) {
            if (!tasksByMission[task.mission_id]) {
              tasksByMission[task.mission_id] = [];
            }
            tasksByMission[task.mission_id].push(task);
          }
        }
        setMissionTasks(prev => ({ ...prev, ...tasksByMission }));
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }
  
  async function fetchMissionTasks(missionId: string) {
    // Don't refetch if we already have tasks for this mission
    if (missionTasks[missionId] && missionTasks[missionId].length > 0) return;
    try {
      console.log(`[MissionsPage] Fetching tasks for mission ${missionId}`);
      const res = await fetch(`/api/tasks?mission_id=${missionId}&limit=100`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(`[MissionsPage] Tasks response:`, data);
      if (data.success) {
        setMissionTasks(prev => ({ ...prev, [missionId]: data.tasks || [] }));
      } else {
        console.error(`[MissionsPage] API error:`, data.error);
        setMissionTasks(prev => ({ ...prev, [missionId]: [] }));
      }
    } catch (err) {
      console.error(`[MissionsPage] Failed to fetch tasks for ${missionId}:`, err);
      setMissionTasks(prev => ({ ...prev, [missionId]: [] }));
    }
  }

  async function deleteMission(missionId: string) {
    if (!confirm('Delete this mission? This cannot be undone.')) return;
    
    setDeleting(missionId);
    try {
      const res = await fetch(`/api/missions/${missionId}`, { method: 'DELETE' });
      if (res.ok) {
        setMissions(prev => prev.filter(m => m.id !== missionId));
      } else {
        alert('Failed to delete mission');
      }
    } catch (err) {
      alert('Error deleting mission');
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function getMissionTasksLocal(missionId: string): Task[] {
    return missionTasks[missionId] || [];
  }

  function getMissionProgress(mission: Mission): number {
    const tasks = getMissionTasksLocal(mission.id);
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  function getMissionAgents(missionId: string): string[] {
    const tasks = getMissionTasksLocal(missionId);
    const agents = new Set(tasks.map(t => t.assigned_agent_id).filter(Boolean));
    return Array.from(agents) as string[];
  }

  const stats = {
    total: missions.length,
    queued: missions.filter(m => m.status === 'draft' || m.status === 'queued').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    complete: missions.filter(m => m.status === 'complete').length,
    blocked: missions.filter(m => m.status === 'blocked').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-500" />
            Mission Control
          </h1>
          <p className="text-gray-400 mt-1">Track mission progress and execution state</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} color="purple" />
        <StatCard label="Queued" value={stats.queued} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="yellow" />
        <StatCard label="Complete" value={stats.complete} color="green" />
        <StatCard label="Blocked" value={stats.blocked} color="red" />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {missions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : 'No missions found'}
          </div>
        ) : (
          missions.map((mission) => {
            const tasks = getMissionTasksLocal(mission.id);
            const progress = getMissionProgress(mission);
            const agents = getMissionAgents(mission.id);
            const isExpanded = expandedMission === mission.id;
            const executingTasks = tasks.filter(t => t.status === 'executing' || t.status === 'in_progress');
            
            return (
              <div key={mission.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                <div 
                  className="p-6 flex items-center gap-4 cursor-pointer hover:bg-[#252525] transition-colors"
                  onClick={() => {
                    setExpandedMission(isExpanded ? null : mission.id);
                    if (!isExpanded) fetchMissionTasks(mission.id);
                  }}
                >
                  <button className="text-gray-400 hover:text-white">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[mission.status]}`}>
                    {mission.status}
                  </span>
                  
                  <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300">
                    {mission.child_task_count || 0} tasks
                  </span>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{mission.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {mission.description?.slice(0, 100) || 'No description'}
                      {mission.description && mission.description.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  
                  <div className="w-40">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {mission.completed_task_count || 0}/{mission.child_task_count || 0} tasks
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <User className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-white">
                        {agents.slice(0, 2).map(getAgentName).join(', ')}
                        {agents.length > 2 && '...'}
                      </span>
                    </div>
                  </div>
                  
                  {executingTasks.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded text-xs text-purple-400">
                      <Zap className="w-3 h-3 animate-pulse" />
                      {executingTasks.length}
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMission(mission.id); }}
                    disabled={deleting === mission.id}
                    className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Delete mission"
                  >
                    {deleting === mission.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-[#2A2A2A] bg-[#151515]">
                    {mission.blocker_reason && (
                      <div className="p-4 bg-red-900/20 border-b border-red-900/30 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-300 text-sm">Blocker: {mission.blocker_reason}</span>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Child Tasks ({mission.child_task_count || 0})
                        </h4>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">{tasks.filter(t => t.status === 'pending' || t.status === 'inbox').length} pending</span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">{tasks.filter(t => t.status === 'executing' || t.status === 'in_progress').length} active</span>
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">{tasks.filter(t => t.status === 'completed').length} done</span>
                        </div>
                      </div>
                      
                      {/* Progress bar for mission */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Mission Progress</span>
                          <span className="text-white">{Math.round(((mission.completed_task_count || 0) / (mission.child_task_count || 1)) * 100)}%</span>
                        </div>
                        <div className="bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all" 
                            style={{ width: `${Math.round(((mission.completed_task_count || 0) / (mission.child_task_count || 1)) * 100)}%` }} 
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {mission.completed_task_count || 0} of {mission.child_task_count || 0} tasks completed
                        </div>
                      </div>
                      
                      {tasks.length === 0 && mission.child_task_count === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 text-sm">No tasks assigned to this mission</p>
                        </div>
                      ) : tasks.length === 0 && mission.child_task_count > 0 ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
                          <p className="text-gray-500 text-sm">Loading {mission.child_task_count} tasks...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tasks.map((task) => (
                            <Link key={task.id} href={`/operations/tasks/${task.id}`}
                              className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg hover:bg-[#252525] transition-colors"
                            >
                              <div className={`w-2 h-2 rounded-full ${getTaskStatusColor(task.status)}`} />
                              <span className="flex-1 text-sm text-white">{task.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[task.status] || 'bg-gray-500/20'}`}>{task.status}</span>
                              {task.execution_id && (
                                <span className="text-[10px] font-mono text-orange-400" title={task.execution_id}>{task.execution_id.slice(0, 6)}...</span>
                              )}
                              <span className="text-xs text-gray-400 min-w-[80px]">{getAgentName(task.assigned_agent_id)}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 pb-4 text-xs text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created: {new Date(mission.created_at).toLocaleString()}</span>
                      <span>Updated: {new Date(mission.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-900/20 border-purple-700 text-purple-400',
    blue: 'bg-blue-900/20 border-blue-700 text-blue-400',
    yellow: 'bg-yellow-900/20 border-yellow-700 text-yellow-400',
    green: 'bg-green-900/20 border-green-700 text-green-400',
    red: 'bg-red-900/20 border-red-700 text-red-400',
  };
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80 mt-1">{label}</div>
    </div>
  );
}
