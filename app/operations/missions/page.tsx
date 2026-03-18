'use client';

import { useState, useEffect } from 'react';
import { 
  Target,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Play,
  RotateCcw,
  X
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'queued' | 'in_progress' | 'complete' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_agent_id: string | null;
  parent_mission_id: string | null;
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
  mission_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  queued: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  executing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  complete: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  closed: 'bg-green-100 text-green-800 border-green-300',
  blocked: 'bg-red-100 text-red-800 border-red-300',
  requested: 'bg-gray-100 text-gray-800 border-gray-300',
  accepted: 'bg-blue-100 text-blue-800 border-blue-300',
  decomposed: 'bg-purple-100 text-purple-800 border-purple-300',
  verifying: 'bg-teal-100 text-teal-800 border-teal-300',
  remediating: 'bg-orange-100 text-orange-800 border-orange-300',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchMissions() {
    try {
      setLoading(true);
      const res = await fetch('/api/missions', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.success) {
        setMissions(data.missions || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch missions');
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
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    fetchMissions();
    fetchTasks();
  }, []);

  const stats = {
    total: missions.length,
    queued: missions.filter(m => m.status === 'draft').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    complete: missions.filter(m => m.status === 'complete').length,
    blocked: missions.filter(m => m.status === 'blocked').length,
  };

  function getMissionTasks(missionId: string): Task[] {
    return tasks.filter(t => t.mission_id === missionId);
  }

  function getProgressPercent(mission: Mission): number {
    if (!mission.child_task_count) return 0;
    return Math.round((mission.completed_task_count / mission.child_task_count) * 100);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-500" />
            Mission Control
          </h1>
          <p className="text-gray-400 mt-1">
            Manage mission queue, track progress, and unblock work
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { fetchMissions(); fetchTasks(); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            New Mission
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} color="purple" />
        <StatCard label="Queued" value={stats.queued} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="yellow" />
        <StatCard label="Complete" value={stats.complete} color="green" />
        <StatCard label="Blocked" value={stats.blocked} color="red" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* Missions List */}
      <div className="space-y-4">
        {missions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : 'No missions found'}
          </div>
        ) : (
          missions.map((mission) => {
            const missionTasks = getMissionTasks(mission.id);
            const progress = getProgressPercent(mission);
            const isExpanded = expandedMission === mission.id;
            
            return (
              <div 
                key={mission.id} 
                className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden"
              >
                {/* Mission Header */}
                <div 
                  className="p-6 flex items-center gap-4 cursor-pointer hover:bg-[#252525] transition-colors"
                  onClick={() => setExpandedMission(isExpanded ? null : mission.id)}
                >
                  <button className="text-gray-400 hover:text-white">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  
                  {/* Status */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[mission.status]}`}>
                    {mission.status}
                  </span>
                  
                  {/* Priority */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[mission.priority]}`}>
                    {mission.priority}
                  </span>
                  
                  {/* Title */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{mission.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {mission.description?.slice(0, 100) || 'No description'}
                      {mission.description && mission.description.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  
                  {/* Progress */}
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {mission.completed_task_count}/{mission.child_task_count} tasks
                    </div>
                  </div>
                  
                  {/* Agent */}
                  <div className="flex items-center gap-2 text-gray-400 text-sm min-w-[120px]">
                    <User className="w-4 h-4" />
                    {mission.assigned_agent_id?.slice(0, 8) || 'Unassigned'}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {mission.status === 'blocked' && (
                      <button className="p-2 text-yellow-400 hover:bg-yellow-900/30 rounded-lg" title="Unblock">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {(mission.status === 'queued' || mission.status === 'draft') && (
                      <button className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg" title="Start">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {mission.status === 'in_progress' && (
                      <button className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg" title="Complete">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg" title="Delete">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Expanded Tasks */}
                {isExpanded && (
                  <div className="border-t border-[#2A2A2A] bg-[#151515]">
                    {mission.blocker_reason && (
                      <div className="p-4 bg-red-900/20 border-b border-red-900/30 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-300 text-sm">Blocker: {mission.blocker_reason}</span>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Child Tasks ({missionTasks.length})
                      </h4>
                      
                      {missionTasks.length === 0 ? (
                        <p className="text-gray-500 text-sm">No tasks assigned to this mission</p>
                      ) : (
                        <div className="space-y-2">
                          {missionTasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg"
                            >
                              <StatusDot status={task.status} />
                              <span className="flex-1 text-sm">{task.title}</span>
                              <span className="text-xs text-gray-500">
                                {task.assigned_agent_id?.slice(0, 8) || 'Unassigned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 pb-4 text-xs text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created: {new Date(mission.created_at).toLocaleString()}
                      </span>
                      <span>Updated: {new Date(mission.updated_at).toLocaleString()}</span>
                      {mission.started_at && (
                        <span>Started: {new Date(mission.started_at).toLocaleString()}</span>
                      )}
                      {mission.completed_at && (
                        <span>Completed: {new Date(mission.completed_at).toLocaleString()}</span>
                      )}
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

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-gray-500',
  };
  
  return (
    <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
  );
}
