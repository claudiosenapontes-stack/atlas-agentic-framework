'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, Clock, CheckCircle2, Users, Flag, AlertCircle, ChevronRight, Search, RefreshCw, Shield } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  requested: { label: 'Requested', color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10' },
  accepted: { label: 'Accepted', color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10' },
  decomposed: { label: 'Decomposed', color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' },
  executing: { label: 'Executing', color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10' },
  blocked: { label: 'Blocked', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10' },
  verifying: { label: 'Verifying', color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10' },
  remediating: { label: 'Remediating', color: 'text-[#F97316]', bg: 'bg-[#F97316]/10' },
  closed: { label: 'Closed', color: 'text-[#16C784]', bg: 'bg-[#16C784]/10' },
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchMissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/missions?limit=100', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (err) {
      console.error('Failed to fetch missions:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMissions();
  }, []);

  const owners = Array.from(new Set(missions.map(m => m.owner_agent || m.owner)));
  const phases = Array.from(new Set(missions.map(m => m.phase)));

  const filteredMissions = missions.filter(mission => {
    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
    const matchesPhase = phaseFilter === 'all' || mission.phase === phaseFilter;
    const matchesOwner = ownerFilter === 'all' || (mission.owner_agent || mission.owner) === ownerFilter;
    const matchesSearch = searchQuery === '' || 
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPhase && matchesOwner && matchesSearch;
  });

  const stats = {
    total: missions.length,
    executing: missions.filter(m => m.status === 'executing' || m.status === 'in_progress').length,
    verifying: missions.filter(m => m.status === 'verifying').length,
    closed: missions.filter(m => m.status === 'closed' || m.status === 'completed').length,
    blocked: missions.filter(m => m.status === 'blocked').length,
  };

  function getStatusDisplay(status: string) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium ${config.bg} ${config.color}`}>
        {config.label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Missions</h1>
              <p className="text-sm text-[#6B7280]">Mission Control for Henry, Olivia, and Claudio</p>
            </div>
          </div>
          <button 
            onClick={fetchMissions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Total</span>
            </div>
            <p className="text-2xl font-semibold text-white">{loading ? '-' : stats.total}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-[#FFB020]" />
              <span className="text-xs text-[#6B7280]">Executing</span>
            </div>
            <p className="text-2xl font-semibold text-[#FFB020]">{loading ? '-' : stats.executing}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-[#14B8A6]" />
              <span className="text-xs text-[#6B7280]">Verifying</span>
            </div>
            <p className="text-2xl font-semibold text-[#14B8A6]">{loading ? '-' : stats.verifying}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
              <span className="text-xs text-[#6B7280]">Closed</span>
            </div>
            <p className="text-2xl font-semibold text-[#16C784]">{loading ? '-' : stats.closed}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-xs text-[#6B7280]">Blocked</span>
            </div>
            <p className="text-2xl font-semibold text-[#FF3B30]">{loading ? '-' : stats.blocked}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select 
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
            >
              <option value="all">All Phases</option>
              {phases.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
            <select 
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white"
            >
              <option value="all">All Owners</option>
              {owners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input 
              type="text" 
              placeholder="Search missions by ID, title, or objective..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white placeholder-[#6B7280]"
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
              <Rocket className="w-8 h-8 mx-auto mb-3 text-[#6B7280]" />
              <p className="text-sm text-[#9BA3AF]">No missions found</p>
            </div>
          ) : (
            filteredMissions.map((mission) => (
              <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
                <div className="group p-5 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#FF6A00]/50 transition-all cursor-pointer h-full">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusDisplay(mission.status)}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] text-[#9BA3AF]">
                        {mission.phase}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#FF6A00]" />
                  </div>

                  {/* Mission ID & Title */}
                  <p className="text-[10px] text-[#6B7280] font-mono mb-1">{mission.id}</p>
                  <h3 className="text-lg font-medium text-white mb-2">{mission.title}</h3>
                  
                  {/* Objective */}
                  <p className="text-sm text-[#9BA3AF] mb-3 line-clamp-2">{mission.objective}</p>

                  {/* Owner */}
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs text-[#9BA3AF]">Owner: <span className="text-white">{mission.owner_agent || mission.owner}</span></span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#6B7280]">Progress</span>
                      <span className="text-white font-medium">{mission.percentComplete}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${mission.percentComplete >= 80 ? 'bg-[#16C784]' : mission.percentComplete >= 50 ? 'bg-[#FFB020]' : 'bg-[#FF6A00]'}`}
                        style={{ width: `${mission.percentComplete}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[#6B7280]">
                        <Users className="w-3 h-3" />
                        {(mission.assigned_agents || mission.assignedAgents).length}
                      </span>
                      {mission.closure_confidence && (
                        <span className="flex items-center gap-1 text-[#6B7280]">
                          <Flag className="w-3 h-3" />
                          {mission.closure_confidence}%
                        </span>
                      )}
                    </div>
                    {(mission.current_blocker || mission.currentBlocker) && (
                      <span className="flex items-center gap-1 text-[#FF3B30]">
                        <AlertCircle className="w-3 h-3" />
                        Blocked
                      </span>
                    )}
                  </div>

                  {/* Henry's Verdict */}
                  {(mission.henry_audit_verdict || mission.henryAuditVerdict) !== 'pending' && (
                    <div className="mt-3 pt-3 border-t border-[#1F2226]">
                      <span className="text-xs text-[#6B7280]">
                        Henry: <span className={
                          (mission.henry_audit_verdict || mission.henryAuditVerdict) === 'approved' ? 'text-[#16C784]' : 'text-[#FF3B30]'
                        }>
                          {(mission.henry_audit_verdict || mission.henryAuditVerdict).toUpperCase()}
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
