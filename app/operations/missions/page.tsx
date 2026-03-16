'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, ArrowLeft, Plus, Search, Filter, CheckCircle2, Circle,
  Clock, AlertCircle, PauseCircle, XCircle, TrendingUp, Users,
  Calendar, Flag, ChevronRight, MoreHorizontal, Shield, Lock,
  FileCheck, Hourglass, AlertTriangle, User, Bot, Sparkles
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
  evidence_bundle?: {
    verification_claimed?: boolean;
    verification_proven?: boolean;
    closure_claimed?: boolean;
    closure_proven?: boolean;
    verified_by?: string;
    closed_by?: string;
  };
}

const statusConfig = {
  draft: { icon: Circle, color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30', label: 'Draft' },
  active: { icon: TrendingUp, color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', border: 'border-[#16C784]/30', label: 'Active' },
  in_progress: { icon: Clock, color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', border: 'border-[#16C784]/30', label: 'Completed' },
  closed: { icon: Lock, color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30', label: 'Closed' },
  cancelled: { icon: XCircle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/30', label: 'Cancelled' },
};

const priorityConfig = {
  low: { color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30' },
  medium: { color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30' },
  high: { color: 'text-[#FF6A00]', bg: 'bg-[#FF6A00]/10', border: 'border-[#FF6A00]/30' },
  critical: { color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/30' },
};

const phaseConfig = {
  planning: { icon: Target, label: 'Planning', desc: 'Defining scope & objectives' },
  execution: { icon: TrendingUp, label: 'Execution', desc: 'Active work in progress' },
  verification: { icon: Shield, label: 'Verification', desc: 'Henry validating outcomes' },
  closure: { icon: Lock, label: 'Closure', desc: 'Finalizing & archiving' },
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
                         m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.owner_agent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || m.priority === priorityFilter;
    const matchesPhase = phaseFilter === 'all' || m.phase === phaseFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesPhase;
  });

  const missionsByStatus = missions.reduce((acc: any, m) => { 
    acc[m.status] = (acc[m.status] || 0) + 1; 
    return acc; 
  }, {});

  const getProgressBarColor = (percent: number, blocked?: boolean) => {
    if (blocked) return 'bg-[#FF3B30]';
    if (percent >= 80) return 'bg-[#16C784]';
    if (percent >= 50) return 'bg-[#FFB020]';
    if (percent >= 20) return 'bg-[#FF6A00]';
    return 'bg-[#FF3B30]';
  };

  const getStatusDisplay = (mission: Mission) => {
    const config = statusConfig[mission.status];
    const Icon = config.icon;
    
    if (mission.blocked_reason) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">BLOCKED</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.border} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Mission Control</h1>
              <p className="text-sm text-[#6B7280]">Track ownership, blockers, verification & closure status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchMissions}
              className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors"
            >
              <TrendingUp className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = missionsByStatus[status] || 0;
            const Icon = config.icon;
            return (
              <div key={status} className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-xs text-[#6B7280]">{config.label}</span>
                </div>
                <p className="text-2xl font-semibold text-white">{loading ? '-' : count}</p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mb-6 p-4 bg-[#111214]/50 border border-[#1F2226] rounded-[10px]">
          <p className="text-xs text-[#6B7280] mb-3">Quick Reference</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FFB020]" />
              <span className="text-[#9BA3AF]">Henry verifying</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#16C784]" />
              <span className="text-[#9BA3AF]">Verified & proven</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FFB020]" />
              <span className="text-[#9BA3AF]">Closure claimed (pending proof)</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#16C784]" />
              <span className="text-[#9BA3AF]">Closed & proven</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search missions, objectives, or owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00]/50"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
            >
              <option value="all">All Status</option>
              {Object.keys(statusConfig).map(s => (
                <option key={s} value={s}>{statusConfig[s as keyof typeof statusConfig].label}</option>
              ))}
            </select>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
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
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
            >
              <option value="all">All Phases</option>
              <option value="planning">Planning</option>
              <option value="execution">Execution</option>
              <option value="verification">Verification</option>
              <option value="closure">Closure</option>
            </select>
          </div>
        </div>

        {/* Mission Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Clock className="w-6 h-6 text-[#6B7280] animate-spin" />
            </div>
          ) : filteredMissions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Target className="w-8 h-8 mx-auto mb-3 text-[#6B7280]" />
              <p className="text-sm text-[#9BA3AF]">No missions found</p>
            </div>
          ) : (
            filteredMissions.map((mission) => {
              const PhaseIcon = phaseConfig[mission.phase].icon;
              const priorityCfg = priorityConfig[mission.priority];
              const isBlocked = !!mission.blocked_reason;
              
              return (
                <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
                  <div className={`group p-5 bg-[#111214] border ${isBlocked ? 'border-[#FF3B30]/50' : 'border-[#1F2226]'} rounded-[10px] hover:border-[#FF6A00]/50 transition-all cursor-pointer h-full`}>
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusDisplay(mission)}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityCfg.bg} ${priorityCfg.color} ${priorityCfg.border}`}>
                          {mission.priority}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#FF6A00] transition-colors" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-medium text-white mb-1">{mission.title}</h3>
                    {mission.objective && (
                      <p className="text-sm text-[#9BA3AF] mb-3 line-clamp-2">{mission.objective}</p>
                    )}

                    {/* Phase & Owner */}
                    <div className="flex items-center gap-2 mb-3 text-xs text-[#6B7280]">
                      <PhaseIcon className="w-3.5 h-3.5" />
                      <span>{phaseConfig[mission.phase].label}</span>
                      {mission.owner_agent && (
                        <>
                          <span className="mx-1">•</span>
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-[#9BA3AF]">Owner: {mission.owner_agent}</span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
