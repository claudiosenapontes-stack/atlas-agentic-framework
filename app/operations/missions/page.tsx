'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, Rocket, Clock, CheckCircle2, Users, Flag, AlertCircle, ChevronRight, Search, Filter } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  objective: string;
  owner: string;
  phase: string;
  status: 'pending' | 'in_progress' | 'completed';
  realm: string;
  percentComplete: number;
  assignedAgents: string[];
  currentBlocker: string | null;
  henryAuditVerdict: 'pending' | 'approved' | 'needs_work';
}

const missions: Mission[] = [
  {
    id: "mission-001",
    title: "ATLAS Gate 4 Verification",
    objective: "Complete Gate 4 milestone verification with full evidence package",
    owner: "Henry",
    phase: "audit",
    status: "in_progress",
    realm: "Operations",
    percentComplete: 75,
    assignedAgents: ["Henry", "Olivia"],
    currentBlocker: "Awaiting final deployment confirmation from Optimus",
    henryAuditVerdict: "pending",
  },
  {
    id: "mission-002",
    title: "EO Backend Stability",
    objective: "Resolve all Executive Ops backend timeouts and ensure 99% uptime",
    owner: "Olivia",
    phase: "stabilization",
    status: "in_progress",
    realm: "Executive Ops",
    percentComplete: 60,
    assignedAgents: ["Olivia", "Optimus"],
    currentBlocker: "Supabase connection intermittent - needs retry logic",
    henryAuditVerdict: "needs_work",
  },
  {
    id: "mission-003",
    title: "Knowledge Realm Standardization",
    objective: "Standardize all realm visual patterns and full-width layouts",
    owner: "Prime",
    phase: "implementation",
    status: "completed",
    realm: "Knowledge",
    percentComplete: 100,
    assignedAgents: ["Prime"],
    currentBlocker: null,
    henryAuditVerdict: "approved",
  },
  {
    id: "mission-004",
    title: "Fleet Health Monitoring",
    objective: "Implement real-time fleet health dashboard with alerting",
    owner: "Optimus",
    phase: "planning",
    status: "pending",
    realm: "Control",
    percentComplete: 15,
    assignedAgents: ["Optimus", "Henry"],
    currentBlocker: "Waiting for PM2 metrics endpoint configuration",
    henryAuditVerdict: "pending",
  },
  {
    id: "mission-005",
    title: "ATLAS Documentation Portal",
    objective: "Create comprehensive documentation portal for all realms",
    owner: "Harvey",
    phase: "drafting",
    status: "in_progress",
    realm: "Knowledge",
    percentComplete: 35,
    assignedAgents: ["Harvey", "Einstein"],
    currentBlocker: "Need clarification on Operations vs Tactical boundaries",
    henryAuditVerdict: "pending",
  },
];

export default function MissionsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = missions.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.owner.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: missions.length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
    pending: missions.filter(m => m.status === 'pending').length,
  };

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
              <p className="text-sm text-[#6B7280]">Track Henry and Olivia across all active missions</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Total</span>
            </div>
            <p className="text-2xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs text-[#6B7280]">In Progress</span>
            </div>
            <p className="text-2xl font-semibold text-[#3B82F6]">{stats.inProgress}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
              <span className="text-xs text-[#6B7280]">Completed</span>
            </div>
            <p className="text-2xl font-semibold text-[#16C784]">{stats.completed}</p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Pending</span>
            </div>
            <p className="text-2xl font-semibold text-white">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1">
            {['all', 'in_progress', 'completed', 'pending'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30' : 'bg-[#1F2226] text-[#9BA3AF]'}`}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white" />
          </div>
        </div>

        {/* Mission Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((mission) => (
            <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
              <div className="group p-5 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#FF6A00]/50 transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${mission.status === 'completed' ? 'bg-[#16C784]/10 text-[#16C784]' : mission.status === 'in_progress' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#6B7280]/10 text-[#6B7280]'}`}>
                      {mission.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] text-[#9BA3AF]">{mission.realm}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#FF6A00]" />
                </div>

                <h3 className="text-lg font-medium text-white mb-1">{mission.title}</h3>
                <p className="text-xs text-[#9BA3AF] mb-3">Owner: <span className="text-white">{mission.owner}</span></p>
                <p className="text-sm text-[#9BA3AF] mb-4 line-clamp-2">{mission.objective}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6B7280]">Progress</span>
                    <span className="text-white font-medium">{mission.percentComplete}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6A00] rounded-full" style={{ width: `${mission.percentComplete}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[#6B7280]"><Users className="w-3 h-3" />{mission.assignedAgents.length}</span>
                    <span className="flex items-center gap-1 text-[#6B7280]"><Flag className="w-3 h-3" />{mission.phase}</span>
                  </div>
                  {mission.currentBlocker && <span className="flex items-center gap-1 text-[#FF3B30]"><AlertCircle className="w-3 h-3" />Blocked</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
