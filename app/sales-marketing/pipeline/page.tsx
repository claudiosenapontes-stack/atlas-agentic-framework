'use client';

import { useState, useEffect } from 'react';
import { Filter, Users, DollarSign, TrendingUp, Clock, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  lastActivity: string;
  daysInStage: number;
}

const mockLeads: Lead[] = [
  { id: '1', name: 'Acme Corp', company: 'Acme Industries', value: 50000, stage: 'proposal', priority: 'high', assignedTo: 'Alice', lastActivity: '2026-03-15', daysInStage: 5 },
  { id: '2', name: 'TechStart Inc', company: 'TechStart', value: 25000, stage: 'qualified', priority: 'medium', assignedTo: 'Bob', lastActivity: '2026-03-14', daysInStage: 3 },
  { id: '3', name: 'Global Solutions', company: 'Global Solutions LLC', value: 100000, stage: 'negotiation', priority: 'high', assignedTo: 'Alice', lastActivity: '2026-03-16', daysInStage: 12 },
  { id: '4', name: 'StartupXYZ', company: 'XYZ Startup', value: 15000, stage: 'prospect', priority: 'low', assignedTo: 'Charlie', lastActivity: '2026-03-10', daysInStage: 7 },
  { id: '5', name: 'Enterprise Co', company: 'Enterprise Solutions', value: 200000, stage: 'closed', priority: 'high', assignedTo: 'Alice', lastActivity: '2026-03-12', daysInStage: 0 },
];

const stages = [
  { id: 'prospect', label: 'Prospect', color: 'bg-[#6B7280]' },
  { id: 'qualified', label: 'Qualified', color: 'bg-[#3B82F6]' },
  { id: 'proposal', label: 'Proposal', color: 'bg-[#FFB020]' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-[#FF6A00]' },
  { id: 'closed', label: 'Closed', color: 'bg-[#16C784]' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [expandedStages, setExpandedStages] = useState<string[]>(stages.map(s => s.id));

  const filteredLeads = leads.filter(l => filter === 'all' || l.priority === filter);

  const stats = {
    totalValue: leads.reduce((sum, l) => sum + (l.stage === 'closed' ? l.value : 0), 0),
    pipelineValue: leads.reduce((sum, l) => sum + (l.stage !== 'closed' ? l.value : 0), 0),
    totalLeads: leads.length,
    avgDealSize: leads.length > 0 ? leads.reduce((sum, l) => sum + l.value, 0) / leads.length : 0,
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => 
      prev.includes(stageId) ? prev.filter(s => s !== stageId) : [...prev, stageId]
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sales Pipeline</h1>
              <p className="text-sm text-[#6B7280]">Track deals from prospect to close</p>
            </div>
          </div>
          <Link href="/sales-marketing/leads/new" className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Lead
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Closed Revenue" value={`$${(stats.totalValue / 1000).toFixed(0)}k`} icon={<DollarSign className="w-4 h-4" />} color="text-green-400" />
          <StatCard label="Pipeline Value" value={`$${(stats.pipelineValue / 1000).toFixed(0)}k`} icon={<TrendingUp className="w-4 h-4" />} color="text-blue-400" />
          <StatCard label="Total Leads" value={stats.totalLeads} icon={<Users className="w-4 h-4" />} color="text-[#FF6A00]" />
          <StatCard label="Avg Deal Size" value={`$${(stats.avgDealSize / 1000).toFixed(0)}k`} icon={<DollarSign className="w-4 h-4" />} color="text-purple-400" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                filter === f
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[#1F2226] text-[#9BA3AF] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Pipeline Stages */}
        <div className="space-y-4">
          {stages.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
            const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
            const isExpanded = expandedStages.includes(stage.id);

            return (
              <div key={stage.id} className="bg-[#111214] border border-[#1F2226] rounded-[10px] overflow-hidden">
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1F2226] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="font-medium text-white">{stage.label}</span>
                    <span className="px-2 py-0.5 bg-[#1F2226] rounded text-xs text-[#9BA3AF]">{stageLeads.length}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#6B7280]">${(stageValue / 1000).toFixed(0)}k</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[#6B7280]" /> : <ChevronRight className="w-4 h-4 text-[#6B7280]" />}
                  </div>
                </button>

                {isExpanded && stageLeads.length > 0 && (
                  <div className="border-t border-[#1F2226]">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-4 hover:bg-[#1F2226]/50 transition-colors border-b border-[#1F2226] last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#1F2226] flex items-center justify-center">
                            <span className="text-lg font-semibold text-white">{lead.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{lead.name}</p>
                            <p className="text-sm text-[#6B7280]">{lead.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium text-white">${(lead.value / 1000).toFixed(0)}k</p>
                            <p className="text-xs text-[#6B7280]">{lead.daysInStage} days</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              lead.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                              lead.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-gray-500/10 text-gray-400'
                            }`}>{lead.priority}</span>
                            <span className="px-2 py-1 bg-[#1F2226] rounded text-xs text-[#9BA3AF]">{lead.assignedTo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>{icon}<span className="text-xs text-[#6B7280]">{label}</span></div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
