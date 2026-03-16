'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, LayoutDashboard, CheckSquare, Users, TrendingUp, Flag, Building2, AlertCircle, RefreshCw, Radio, UserCircle2, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

interface DelegationItem {
  id: string;
  taskTitle: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  delegatedAt: string;
  dueDate: string | null;
}

export default function TacticalDelegationPage() {
  const [delegations, setDelegations] = useState<DelegationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchDelegations();
  }, []);

  async function fetchDelegations() {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical/delegations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDelegations(data.delegations || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[TacticalDelegation] Error:', err);
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
            const isActive = item.href === '/tactical/delegation';
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
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Delegation Board</h1>
              <p className="text-sm text-[#6B7280]">Track work delegated across agents</p>
            </div>
          </div>
          <button onClick={fetchDelegations} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <ArrowRightLeft className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Delegation Tracking Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The delegation tracking API is not yet available. Task handoffs and agent assignments will appear once the service is deployed.
            </p>
            <button onClick={fetchDelegations} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : delegations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <Users className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No active delegations</p>
            <p className="text-xs text-[#6B7280] mt-1">Tasks delegated to other agents will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {delegations.map((d) => (
              <DelegationRow key={d.id} delegation={d} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DelegationRow({ delegation }: { delegation: DelegationItem }) {
  const statusColors = {
    pending: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
    accepted: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    in_progress: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
    completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#111214] border border-[#1F2226] rounded-lg hover:border-[#6B7280]/30 transition-colors">
      <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[delegation.status]}`}>{delegation.status.replace('_', ' ')}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{delegation.taskTitle}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
        <UserCircle2 className="w-3.5 h-3.5" />
        <span>{delegation.from}</span>
        <ArrowRightLeft className="w-3 h-3" />
        <span>{delegation.to}</span>
      </div>
      {delegation.dueDate && <span className="text-xs text-[#6B7280]">Due: {delegation.dueDate}</span>}
    </div>
  );
}
