'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, Flag, Users, CheckCircle2, Clock, AlertCircle, 
  ArrowRight, RefreshCw, Filter, Plus, Search, ChevronRight
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  objective: string;
  owner: string;
  phase: string;
  status: string;
  realm: string;
  percentComplete: number;
  successCriteria: string;
  assignedAgents: string[];
  evidenceReceived: string[];
  henryAuditVerdict: string;
  currentBlocker: string | null;
  childTasks: string[];
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  in_progress: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  blocked: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

const verdictColors: Record<string, string> = {
  approved: 'text-[#16C784]',
  pending: 'text-[#FFB020]',
  needs_work: 'text-[#FF3B30]',
};

const realmColors: Record<string, string> = {
  Operations: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'Executive Ops': 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  Knowledge: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  Control: 'from-green-500/20 to-green-600/10 border-green-500/30',
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchMissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/missions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMissions();
  }, []);

  const filteredMissions = missions.filter(mission => {
    const matchesFilter = filter === 'all' || mission.status === filter;
    const matchesSearch = searchQuery === '' || 
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.realm.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: missions.length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
    pending: missions.filter(m => m.status === 'pending').length,
    blocked: missions.filter(m => m.status === 'blocked').length,
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header - Knowledge Pattern */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Missions</h1>
              <p className="text-sm text-[#6B7280]">Track Henry and Olivia across all active missions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchMissions}
              className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats - Knowledge Pattern */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Total Missions</span>
            </div>
            <p className="text-2xl font-semibold text-white">{loading ? '-' : stats.total}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs text-[#6B7280]">In Progress</span>
            </div>
            <p className="text-2xl font-semibold text-[#3B82F6]">{loading ? '-' : stats.inProgress}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
              <span className="text-xs text-[#6B7280]">Completed</span>
            </div>
            <p className="text-2xl font-semibold text-[#16C784]">{loading ? '-' : stats.completed}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Pending</span>
            </div>
            <p className="text-2xl font-semibold text-white">{loading ? '-' : stats.pending}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-xs text-[#6B7280]">Blocked</span>
            </div>
            <p className="text-2xl font-semibold text-[#FF3B30]">{loading ? '-' : stats.blocked}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <div className="flex gap-1">
              {(['all', 'in_progress', 'completed', 'pending', 'blocked'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f 
                      ? 'bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30' 
                      : 'bg-[#1F2226] text-[#9BA3AF] hover:bg-[#2A2D32]'
                  }`}
                >
                  {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search missions, owners, realms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00]/50"
            />
          </div>
        </div>

        {/* Mission Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-[#6B7280] animate-spin" />
            </div>
          ) : filteredMissions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Target className="w-8 h-8 mx-auto mb-3 text-[#6B7280]" />
              <p className="text-sm text-[#9BA3AF]">No missions found</p>
            </div>
          ) : (
            filteredMissions.map((mission) => (
              <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
                <div className={`group p-5 bg-gradient-to-br ${realmColors[mission.realm] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30'} border rounded-[10px] hover:opacity-90 transition-all cursor-pointer h-full`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${statusColors[mission.status]}`}>
                        {mission.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {mission.realm}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                  </div>

                  {/* Title & Owner */}
                  <h3 className="text-lg font-medium text-white mb-1">{mission.title}</h3>
                  <p className="text-xs text-white/60 mb-3">Owner: <span className="text-white/80">{mission.owner}</span></p>

                  {/* Objective */}
                  <p className="text-sm text-white/70 mb-4 line-clamp-2">{mission.objective}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white font-medium">{mission.percentComplete}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#FF6A00] rounded-full transition-all"
                        style={{ width: `${mission.percentComplete}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-white/50">
                        <Users className="w-3 h-3" />
                        {mission.assignedAgents.length}
                      </span>
                      <span className="flex items-center gap-1 text-white/50">
                        <CheckCircle2 className="w-3 h-3" />
                        {mission.childTasks.length}
                      </span>
                    </div>
                    {mission.currentBlocker && (
                      <span className="flex items-center gap-1 text-[#FF3B30]">
                        <AlertCircle className="w-3 h-3" />
                        Blocked
                      </span>
                    )}
                  </div>

                  {/* Henry's Verdict */}
                  {mission.henryAuditVerdict !== 'pending' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-xs text-white/50">
                        Henry's Verdict: <span className={verdictColors[mission.henryAuditVerdict]}>
                          {mission.henryAuditVerdict.replace('_', ' ').toUpperCase()}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
