'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Rocket, Clock, CheckCircle2, Users, Flag, AlertCircle, 
  ChevronRight, Search, RefreshCw, XCircle, PlayCircle, 
  PauseCircle, BarChart3, ArrowRight, Zap, AlertTriangle,
  ListTodo, UserCircle, Layers
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  assignee_agent?: string;
  assignee_id?: string;
  priority?: string;
  started_at?: string;
  completed_at?: string;
  blocked_reason?: string;
}

interface Mission {
  id: string;
  title: string;
  objective: string;
  code?: string;
  owner: string;
  owner_agent?: string;
  owner_id?: string;
  phase: string;
  status: string;
  priority: string;
  percentComplete: number;
  progress_percent?: number;
  closure_confidence?: number;
  assignedAgents: string[];
  assigned_agents?: string[];
  currentBlocker: string | null;
  current_blocker?: string | null;
  henryAuditVerdict: string;
  henry_audit_verdict?: string;
  child_task_count?: number;
  completed_task_count?: number;
  pending_task_count?: number;
  in_progress_task_count?: number;
  blocked_task_count?: number;
  failed_task_count?: number;
  tasks?: Task[];
  target_start_date?: string;
  target_end_date?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  requested: { label: 'Requested', color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30', icon: Clock },
  accepted: { label: 'Accepted', color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]/30', icon: CheckCircle2 },
  decomposed: { label: 'Decomposed', color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/30', icon: Zap },
  executing: { label: 'Executing', color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30', icon: PlayCircle },
  blocked: { label: 'BLOCKED', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/50', icon: XCircle },
  verifying: { label: 'Verifying', color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10', border: 'border-[#14B8A6]/30', icon: CheckCircle2 },
  remediating: { label: 'Remediating', color: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]/30', icon: AlertTriangle },
  closed: { label: 'Closed', color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', border: 'border-[#16C784]/30', icon: CheckCircle2 },
};

export default function MissionControlPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');

  async function fetchMissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/missions?limit=100&include_tasks=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMissions(); }, []);

  const filtered = missions.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && m.priority !== priorityFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && 
        !m.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (a.status === 'blocked' && b.status !== 'blocked') return -1;
    if (b.status === 'blocked' && a.status !== 'blocked') return 1;
    if (a.status === 'executing' && b.status !== 'executing') return -1;
    if (b.status === 'executing' && a.status !== 'executing') return 1;
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return (priorityWeight[b.priority as keyof typeof priorityWeight] || 0) - 
           (priorityWeight[a.priority as keyof typeof priorityWeight] || 0);
  });

  const stats = {
    total: missions.length,
    executing: missions.filter(m => m.status === 'executing').length,
    blocked: missions.filter(m => m.status === 'blocked').length,
    needsAttention: missions.filter(m => m.status === 'blocked').length,
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-[#FF6A00]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Mission Control</h1>
            <p className="text-sm text-[#6B7280]">Real-time visibility into missions, tasks, and blockers</p>
          </div>
        </div>
        <button onClick={fetchMissions} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide">Total</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-[#FFB020]/5 border border-[#FFB020]/20 rounded-[10px]">
          <p className="text-xs text-[#FFB020] uppercase tracking-wide">Executing</p>
          <p className="text-3xl font-bold text-[#FFB020] mt-1">{stats.executing}</p>
        </div>
        <div className="p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-[10px]">
          <p className="text-xs text-[#FF3B30] uppercase tracking-wide">Blocked</p>
          <p className="text-3xl font-bold text-[#FF3B30] mt-1">{stats.blocked}</p>
        </div>
        <div className="p-4 bg-[#FF6A00]/5 border border-[#FF6A00]/20 rounded-[10px]">
          <p className="text-xs text-[#FF6A00] uppercase tracking-wide">Needs Attention</p>
          <p className="text-3xl font-bold text-[#FF6A00] mt-1">{stats.needsAttention}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white">
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
          <input type="text" placeholder="Search missions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white" />
        </div>
      </div>

      {/* Mission Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-[#6B7280] animate-spin mx-auto mb-4" />
            <p className="text-[#6B7280]">Loading mission control data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Rocket className="w-12 h-12 mx-auto mb-4 text-[#6B7280]" />
            <h3 className="text-lg font-medium text-white mb-2">No missions found</h3>
            <p className="text-sm text-[#9BA3AF]">{missions.length === 0 ? "Create a mission to get started." : "No missions match your filters."}</p>
          </div>
        ) : filtered.map((mission) => {
          const config = STATUS_CONFIG[mission.status] || STATUS_CONFIG.requested;
          const StatusIcon = config.icon;
          const isBlocked = mission.status === 'blocked';
          const blockerText = mission.current_blocker || mission.currentBlocker;
          const progress = mission.progress_percent || mission.percentComplete || 0;
          const totalTasks = mission.child_task_count || 0;
          const completedTasks = mission.completed_task_count || 0;
          
          return (
            <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
              <div className={`group p-5 rounded-[12px] transition-all cursor-pointer border ${
                isBlocked 
                  ? 'bg-[#FF3B30]/5 border-[#FF3B30]/40 hover:border-[#FF3B30]/60' 
                  : 'bg-[#111214] border-[#1F2226] hover:border-[#FF6A00]/50'
              }`}>
                
                {/* Top Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] uppercase font-bold flex items-center gap-1.5 ${config.bg} ${config.color} border ${config.border}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-[11px] uppercase font-bold ${
                      mission.priority === 'critical' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' :
                      mission.priority === 'high' ? 'bg-[#FF6A00]/20 text-[#FF6A00]' :
                      mission.priority === 'medium' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' :
                      'bg-[#6B7280]/20 text-[#6B7280]'
                    }`}>
                      {mission.priority}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6B7280] group-hover:text-[#FF6A00] transition-colors" />
                </div>

                {/* Blocker Alert */}
                {isBlocked && blockerText && (
                  <div className="mb-4 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                      <span className="text-xs uppercase font-bold text-[#FF3B30]">BLOCKED: {blockerText}</span>
                    </div>
                  </div>
                )}

                {/* Title & ID */}
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white mb-1">{mission.title}</h3>
                  <p className="text-xs text-[#6B7280] font-mono">{mission.id.slice(0, 8)}...</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#6B7280]">Progress</span>
                    <span className="text-white font-medium">{progress}% ({completedTasks}/{totalTasks} tasks)</span>
                  </div>
                  <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#FF6A00] to-[#FF3B30] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Footer: Owner + Agents */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1F2226]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-white">{mission.owner_agent || mission.owner || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-[#9BA3AF]">{(mission.assigned_agents || mission.assignedAgents || []).length} agents</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#6B7280]">{mission.phase}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
