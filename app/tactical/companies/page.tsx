'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, LayoutDashboard, CheckSquare, Users, TrendingUp, Flag, Building2, AlertCircle, RefreshCw, Radio, Briefcase, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  activeTasks: number;
  completedTasks: number;
  activeMilestones: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'at_risk';
}

export default function TacticalCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical/companies', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[TacticalCompanies] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: '/tactical', label: 'Overview', icon: LayoutDashboard },
    { href: '/tactical/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/tactical/delegation', label: 'Delegation', icon: Users },
    { href: '/tactical/productivity', label: 'Productivity', icon: TrendingUp },
    { href: '/tactical/milestones', label: 'Milestones', icon: Flag },
    { href: '/tactical/companies', label: 'Companies', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Tactical Ops</h1>
              <p className="text-[10px] text-[#6B7280]">Real-time Execution Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/tactical/companies';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isActive ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Company Operations</h1>
              <p className="text-sm text-[#6B7280]">Per-company execution view</p>
            </div>
          </div>
          <button onClick={fetchCompanies} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Company Ops Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The company operations API is not yet available. Per-company task tracking and execution visibility will appear once the service is deployed.
            </p>
            <button onClick={fetchCompanies} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <Building2 className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No companies tracked</p>
            <p className="text-xs text-[#6B7280] mt-1">Company operations will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const statusColors = {
    active: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
    inactive: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
    at_risk: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
  };

  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#6B7280]/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <h3 className="font-medium text-white">{company.name}</h3>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[company.status]}`}>{company.status}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
          <p className="text-[10px] text-[#6B7280]">Active Tasks</p>
          <p className="text-lg font-semibold text-white">{company.activeTasks}</p>
        </div>
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
          <p className="text-[10px] text-[#6B7280]">Completed</p>
          <p className="text-lg font-semibold text-white">{company.completedTasks}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>{company.activeMilestones} milestones</span>
        <span>Last: {company.lastActivity}</span>
      </div>
      <Link
        href={`/companies/${company.id}`}
        className="mt-3 flex items-center justify-center gap-1 w-full py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors"
      >
        View Details <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
