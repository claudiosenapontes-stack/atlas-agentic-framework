'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, Clock, CheckCircle2, Users, Flag, AlertCircle, ChevronRight, Search, RefreshCw, Shield, XCircle } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  objective: string;
  owner: string;
  owner_agent?: string;
  phase: string;
  status: string;
  priority: string;
  percentComplete: number;
  closure_confidence?: number;
  assignedAgents: string[];
  assigned_agents?: string[];
  currentBlocker: string | null;
  current_blocker?: string | null;
  henryAuditVerdict: string;
  henry_audit_verdict?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  requested: { label: 'Requested', color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30' },
  accepted: { label: 'Accepted', color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]/30' },
  decomposed: { label: 'Decomposed', color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/30' },
  executing: { label: 'Executing', color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30' },
  blocked: { label: 'BLOCKED', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/50' },
  verifying: { label: 'Verifying', color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10', border: 'border-[#14B8A6]/30' },
  remediating: { label: 'Remediating', color: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]/30' },
  closed: { label: 'Closed', color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', border: 'border-[#16C784]/30' },
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  async function fetchMissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/missions?limit=100', { cache: 'no-store' });
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
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.status === 'blocked' ? -1 : b.status === 'blocked' ? 1 : 0));

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Mission Control</h1>
            <p className="text-sm text-[#6B7280]">Operator-grade visibility for Henry, Olivia, and Claudio</p>
          </div>
        </div>
        <button onClick={fetchMissions} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <p className="text-xs text-[#6B7280]">Total</p>
          <p className="text-2xl font-semibold text-white">{missions.length}</p>
        </div>
        <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <p className="text-xs text-[#6B7280]">Executing</p>
          <p className="text-2xl font-semibold text-[#FFB020]">{missions.filter(m => m.status === 'executing').length}</p>
        </div>
        <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <p className="text-xs text-[#6B7280]">Verifying</p>
          <p className="text-2xl font-semibold text-[#14B8A6]">{missions.filter(m => m.status === 'verifying').length}</p>
        </div>
        <div className="p-4 bg-[#FF3B30]/5 border border-[#FF3B30]/30 rounded-[10px]">
          <p className="text-xs text-[#FF3B30]">Blocked</p>
          <p className="text-2xl font-semibold text-[#FF3B30]">{missions.filter(m => m.status === 'blocked').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white" />
        </div>
      </div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12"><RefreshCw className="w-6 h-6 text-[#6B7280] animate-spin mx-auto" /></div>
        ) : filtered.map((mission) => {
          const config = STATUS_CONFIG[mission.status] || STATUS_CONFIG.requested;
          const blocked = mission.status === 'blocked' || mission.current_blocker || mission.currentBlocker;
          const blockerText = mission.current_blocker || mission.currentBlocker;
          const henry = mission.henry_audit_verdict || mission.henryAuditVerdict || 'pending';
          const claimed = mission.percentComplete || 0;
          const proven = mission.closure_confidence || 0;
          
          return (
            <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
              <div className={`group p-5 rounded-[10px] transition-all cursor-pointer h-full ${blocked ? 'bg-[#FF3B30]/5 border-2 border-[#FF3B30]/50' : 'bg-[#111214] border border-[#1F2226] hover:border-[#FF6A00]/50'}`}>
                {/* Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${config.bg} ${config.color} border ${config.border}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] text-[#9BA3AF]">{mission.phase}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#FF6A00]" />
                </div>

                {/* Blocker Alert */}
                {blocked && blockerText && (
                  <div className="mb-3 p-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded">
                    <div className="flex items-center gap-1.5 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                      <span className="text-[10px] uppercase font-bold text-[#FF3B30]">BLOCKER</span>
                    </div>
                    <p className="text-xs text-[#FF3B30]/90">{blockerText}</p>
                  </div>
                )}

                {/* Title & ID */}
                <p className="text-[10px] text-[#6B7280] font-mono mb-1">{mission.id}</p>
                <h3 className="text-lg font-medium text-white mb-2">{mission.title}</h3>
                <p className="text-sm text-[#9BA3AF] mb-3 line-clamp-2">{mission.objective}</p>

                {/* Owner */}
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-xs text-[#9BA3AF]">Owner: <span className="text-white">{mission.owner_agent || mission.owner}</span></span>
                </div>

                {/* Claimed vs Proven */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6B7280]">Claimed: {claimed}%</span>
                    <span className="text-[#6B7280]">Proven: {proven}%</span>
                  </div>
                  <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 bg-[#6B7280]/30 rounded-full" style={{ width: `${claimed}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-[#16C784] rounded-full" style={{ width: `${proven}%` }} />
                  </div>
                  {claimed > proven && (
                    <p className="text-[10px] text-[#FF3B30] mt-1">⚠ Gap: {claimed - proven}% claimed but not proven</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">{(mission.assigned_agents || mission.assignedAgents).length} agents</span>
                  {henry !== 'pending' && (
                    <span className={`text-xs font-medium ${henry === 'approved' ? 'text-[#16C784]' : 'text-[#FF3B30]'}`}>
                      Henry: {henry.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
