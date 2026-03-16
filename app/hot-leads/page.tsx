'use client';

import { useState, useEffect } from 'react';
import { Flame, Filter, SortAsc, User, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HotLeadCard } from '@/app/components/hot-lead-card';
import { DataStatus } from '@/components/ui/DataStatus';

interface HotLead {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  source: string;
  estimated_value?: number;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  assigned_to?: string;
  created_at: string;
  task_id: string;
  sla_minutes: number;
  due_at: string;
}

export default function HotLeadsPage() {
  const [leads, setLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'created' | 'value'>('score');

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async () => {
    try {
      // Try live data first
      const response = await fetch('/api/leads?hot=true');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        setSource('live');
      } else {
        // Fallback to demo data
        setLeads(getDemoLeads());
        setSource('demo');
      }
    } catch {
      setLeads(getDemoLeads());
      setSource('demo');
    } finally {
      setLastSync(new Date().toISOString());
      setLoading(false);
    }
  };

  const getDemoLeads = (): HotLead[] => [
    {
      id: 'lead_001',
      name: 'Sarah Chen',
      email: 'sarah@techcorp.com',
      company: 'TechCorp Industries',
      score: 92,
      source: 'website',
      estimated_value: 50000,
      status: 'new',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      task_id: 'task_001',
      sla_minutes: 30,
      due_at: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'lead_002',
      name: 'Michael Rodriguez',
      email: 'mrodriguez@startup.io',
      company: 'FastTrack Startup',
      score: 87,
      source: 'referral',
      estimated_value: 35000,
      status: 'contacted',
      assigned_to: 'claudio',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      task_id: 'task_002',
      sla_minutes: 30,
      due_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'lead_003',
      name: 'Emily Watson',
      email: 'ewatson@enterprise.com',
      company: 'Enterprise Solutions',
      score: 95,
      source: 'campaign',
      estimated_value: 75000,
      status: 'qualified',
      assigned_to: 'agent_001',
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      task_id: 'task_003',
      sla_minutes: 60,
      due_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ];

  const filteredLeads = leads
    .filter((lead) => filter === 'all' || lead.status === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'value':
          return (b.estimated_value || 0) - (a.estimated_value || 0);
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    overdue: leads.filter((l) => new Date(l.due_at) < new Date()).length,
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <h1 className="text-xl font-semibold">Hot Leads</h1>
              <DataStatus source={source} lastSync={lastSync} syncing={loading} />
            </div>
            <p className="text-xs text-[#6B7280]">Sales action center — rapid lead response</p>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="New" value={stats.new} color="amber" />
            <StatCard label="Contacted" value={stats.contacted} color="blue" />
            <StatCard label="Qualified" value={stats.qualified} color="green" />
            {stats.overdue > 0 && (
              <StatCard label="Overdue" value={stats.overdue} color="red" />
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-[#111214] rounded-lg border border-[#1F2226]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#9BA3AF]">Filter:</span>
        </div>
        {(['all', 'new', 'contacted', 'qualified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30'
                : 'bg-[#1F2226] text-[#9BA3AF] hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        <div className="w-px h-6 bg-[#1F2226] mx-2" />

        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#9BA3AF]">Sort:</span>
        </div>
        {([
          { key: 'score', label: 'Score' },
          { key: 'created', label: 'Created' },
          { key: 'value', label: 'Value' },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              sortBy === s.key
                ? 'bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30'
                : 'bg-[#1F2226] text-[#9BA3AF] hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Leads Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#6B7280] border-t-[#FF6A00] rounded-full animate-spin" />
            <span>Loading hot leads...</span>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#6B7280]">
          <Flame className="w-12 h-12 mb-4 opacity-30" />
          <p>No hot leads found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <HotLeadCard
              key={lead.id}
              lead={{
                id: lead.id,
                name: lead.name,
                email: lead.email,
                company: lead.company,
                score: lead.score,
                source: lead.source,
                estimated_value: lead.estimated_value,
              }}
              task={{
                id: lead.task_id,
                sla_minutes: lead.sla_minutes,
                due_at: lead.due_at,
              }}
              priority={lead.score >= 90 ? 'urgent' : lead.score >= 75 ? 'high' : 'medium'}
              recipientId={lead.assigned_to || 'claudio'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'default',
}: {
  label: string;
  value: number;
  color?: 'default' | 'amber' | 'blue' | 'green' | 'red';
}) {
  const colors = {
    default: 'bg-[#111214] border-[#1F2226] text-white',
    amber: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]',
    blue: 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]',
    green: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
    red: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
  };

  return (
    <div className={`px-4 py-2 rounded-lg border ${colors[color]}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}
