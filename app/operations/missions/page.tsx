'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, 
  ArrowLeft, 
  Plus, 
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  PauseCircle,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  Flag,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  phase: 'planning' | 'execution' | 'verification' | 'closure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id?: string;
  owner_agent?: string;
  progress_percent: number;
  child_task_count: number;
  completed_task_count: number;
  target_start_date?: string;
  target_end_date?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  blocked_reason?: string;
}

const statusConfig = {
  draft: { icon: Circle, color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', label: 'Draft' },
  active: { icon: TrendingUp, color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', label: 'Active' },
  in_progress: { icon: Clock, color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', label: 'Completed' },
  closed: { icon: PauseCircle, color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', label: 'Closed' },
  cancelled: { icon: XCircle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', label: 'Cancelled' },
};

const priorityConfig = {
  low: { color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30' },
  medium: { color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30' },
  high: { color: 'text-[#FF6A00]', bg: 'bg-[#FF6A00]/10', border: 'border-[#FF6A00]/30' },
  critical: { color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/30' },
};

const phaseConfig = {
  planning: { icon: Target, label: 'Planning' },
  execution: { icon: TrendingUp, label: 'Execution' },
  verification: { icon: CheckCircle2, label: 'Verification' },
  closure: { icon: Flag, label: 'Closure' },
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  useEffect(() => { fetchMissions(); }, []);

  const fetchMissions = async () => {
    try {
      const res = await fetch('/api/missions?limit=100');
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (error) { 
      console.error('Failed to fetch missions:', error); 
      setMissions([]);
    }
    finally { setLoading(false); }
  };

  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || m.priority === priorityFilter;
    const matchesPhase = phaseFilter === 'all' || m.phase === phaseFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesPhase;
  });

  const missionsByStatus = missions.reduce((acc: any, m) => { 
    acc[m.status] = (acc[m.status] || 0) + 1; 
    return acc; 
  }, {});

  const getProgressBarColor = (percent: number) => {
    if (percent >= 80) return 'bg-[#16C784]';
    if (percent >= 50) return 'bg-[#FFB020]';
    if (percent >= 20) return 'bg-[#FF6A00]';
    return 'bg-[#FF3B30]';
  };

  const getStatusDisplay = (mission: Mission) => {
    const config = statusConfig[mission.status];
    const Icon = config.icon;
    
    if (mission.status === 'in_progress' && mission.blocked_reason) {
      return (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Blocked</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <button className="hover:bg-[#1F2226] p-2 rounded transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#9BA3AF]" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Mission Control</h1>
            <p className="text-[#9BA3AF] text-sm">Strategic mission orchestration and progress tracking</p>
          </div>
        </div>
        <button className="bg-[#FF6A00] hover:bg-[#FF6A00]/90 px-4 py-2 rounded-lg text-white font-medium transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          New Mission
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: missions.length },
          { label: 'Active', value: missionsByStatus.active || 0, color: 'text-[#16C784]' },
          { label: 'In Progress', value: missionsByStatus.in_progress || 0, color: 'text-[#FFB020]' },
          { label: 'Blocked', value: missions.filter(m => m.status === 'in_progress' && m.blocked_reason).length, color: 'text-red-500' },
          { label: 'Completed', value: missionsByStatus.completed || 0, color: 'text-[#16C784]' },
          { label: 'Draft', value: missionsByStatus.draft || 0, color: 'text-[#6B7280]' },
          { label: 'Closed', value: (missionsByStatus.closed || 0) + (missionsByStatus.cancelled || 0), color: 'text-[#6B7280]' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <p className="text-[#9BA3AF] text-xs uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#111214] border border-[#1F2226] rounded-lg p-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-[#6B7280] flex-1 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1F2226] border border-[#2A2D32] rounded px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#1F2226] border border-[#2A2D32] rounded px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="bg-[#1F2226] border border-[#2A2D32] rounded px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value="all">All Phase</option>
            <option value="planning">Planning</option>
            <option value="execution">Execution</option>
            <option value="verification">Verification</option>
            <option value="closure">Closure</option>
          </select>
        </div>
      </div>

      {/* Missions Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-[#FF6A00] border-t-transparent rounded-full" />
        </div>
      ) : filteredMissions.length === 0 ? (
        <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-12 text-center">
          <Target className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No missions found</h3>
          <p className="text-[#9BA3AF] text-sm">
            {missions.length === 0 
              ? 'Create your first mission to get started' 
              : 'No missions match your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMissions.map((mission) => {
            const priority = priorityConfig[mission.priority];
            const phase = phaseConfig[mission.phase];
            const PhaseIcon = phase.icon;
            
            return (
              <div 
                key={mission.id} 
                className={`bg-[#111214] border ${mission.blocked_reason ? 'border-red-500/30' : 'border-[#1F2226]'} rounded-lg p-5 hover:border-[#FF6A00]/30 transition-colors group`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusDisplay(mission)}
                    <div className={`px-2 py-0.5 rounded text-xs font-medium border ${priority.bg} ${priority.color} ${priority.border}`}>
                      {mission.priority.charAt(0).toUpperCase() + mission.priority.slice(1)}
                    </div>
                    <div className="flex items-center gap-1 text-[#9BA3AF] text-xs">
                      <PhaseIcon className="w-3.5 h-3.5" />
                      {phase.label}
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1F2226] rounded transition-all">
                    <MoreHorizontal className="w-4 h-4 text-[#9BA3AF]" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold text-lg mb-1">{mission.title}</h3>
                {mission.objective && (
                  <p className="text-[#9BA3AF] text-sm mb-3 line-clamp-2">{mission.objective}</p>
                )}

                {/* Blocked Warning */}
                {mission.blocked_reason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-red-400 text-xs font-medium">Blocked</p>
                        <p className="text-[#9BA3AF] text-sm">{mission.blocked_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#9BA3AF]">Progress</span>
                    <span className="text-white font-medium">{mission.progress_percent}%</span>
                  </div>
                  <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getProgressBarColor(mission.progress_percent)} transition-all`}
                      style={{ width: `${mission.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1F2226]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[#9BA3AF] text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{mission.completed_task_count}/{mission.child_task_count} tasks</span>
                    </div>
                    {mission.target_end_date && (
                      <div className="flex items-center gap-1.5 text-[#9BA3AF] text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(mission.target_end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-[#FF6A00] text-xs hover:text-[#FF6A00]/80 transition-colors">
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}