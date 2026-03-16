'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, LayoutDashboard, CheckSquare, Users, TrendingUp, Flag, Building2, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import Link from 'next/link';

interface TacticalSnapshot {
  activeTasks: number;
  delegatedTasks: number;
  completionRate: number | null;
  pendingMilestones: number;
  activeCompanies: number;
}

export default function TacticalOpsPage() {
  const [snapshot, setSnapshot] = useState<TacticalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchSnapshot();
  }, []);

  async function fetchSnapshot() {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical/snapshot', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setDataSource('live');
        setLastUpdated(new Date());
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[TacticalOps] Snapshot error:', err);
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
      {/* Header */}
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
        
        {/* Sub-navigation */}
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/tactical';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isActive
                    ? 'text-white bg-[#1F2226]'
                    : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
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
        {/* Data Status Bar */}
        <div className="flex items-center justify-between p-3 bg-[#111214] rounded-lg border border-[#1F2226] mb-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
            <span className="text-xs text-[#9BA3AF]">
              {dataSource === 'live'
                ? `Tactical telemetry active • ${lastUpdated?.toLocaleTimeString() || 'Just now'}`
                : 'Tactical backend not yet connected'}
            </span>
          </div>
          <button
            onClick={fetchSnapshot}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Tactical Overview</h1>
              <p className="text-sm text-[#6B7280]">Real-time execution visibility</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {dataSource === 'unavailable' && (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Tactical Ops Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The tactical execution backend is not yet available. Real-time task telemetry,
              delegation tracking, and productivity metrics will appear once the service is deployed.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchSnapshot}
                disabled={loading}
                className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Connection'}
              </button>
            </div>
          </div>
        )}

        {/* Live Data Dashboard */}
        {dataSource === 'live' && snapshot && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={<CheckSquare className="w-4 h-4" />}
              label="Active Tasks"
              value={snapshot.activeTasks}
              color="blue"
            />
            <MetricCard
              icon={<Users className="w-4 h-4" />}
              label="Delegated Tasks"
              value={snapshot.delegatedTasks}
              color="purple"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Completion Rate"
              value={snapshot.completionRate !== null ? `${snapshot.completionRate}%` : '--'}
              color="green"
            />
            <MetricCard
              icon={<Flag className="w-4 h-4" />}
              label="Pending Milestones"
              value={snapshot.pendingMilestones}
              color="amber"
            />
            <MetricCard
              icon={<Building2 className="w-4 h-4" />}
              label="Active Companies"
              value={snapshot.activeCompanies}
              color="cyan"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickActionCard
              href="/tactical/tasks"
              icon={<CheckSquare className="w-5 h-5" />}
              title="Task Center"
              description="View and manage active tasks"
            />
            <QuickActionCard
              href="/tactical/delegation"
              icon={<Users className="w-5 h-5" />}
              title="Delegation Board"
              description="Track delegated work across agents"
            />
            <QuickActionCard
              href="/tactical/companies"
              icon={<Building2 className="w-5 h-5" />}
              title="Company Ops"
              description="Per-company execution view"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: 'blue' | 'purple' | 'green' | 'amber' | 'cyan' }) {
  const colorMap = {
    blue: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    purple: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
    green: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
    amber: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
    cyan: 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30',
  };

  return (
    <div className={`p-4 rounded-[10px] border bg-[#111214] ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs opacity-80">{label}</span></div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuickActionCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#6B7280]/30 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[#1F2226] flex items-center justify-center text-[#9BA3AF]">{icon}</div>
      <div>
        <h4 className="font-medium text-sm text-white mb-1">{title}</h4>
        <p className="text-xs text-[#6B7280]">{description}</p>
      </div>
    </Link>
  );
}
