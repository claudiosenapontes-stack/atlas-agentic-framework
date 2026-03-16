'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, Calendar, GitBranch, Eye, Terminal, ChevronRight,
  Target, Clock, CheckCircle2, Loader2, AlertCircle, TrendingUp,
  Activity, Zap, ArrowUpRight, BarChart3
} from 'lucide-react';

interface ExecutiveSnapshot {
  date: string;
  priorities: any[];
  meetingsToday: number;
  pendingDecisions: number;
  watchlistItems: number;
  pendingApprovals: number;
  pendingFollowups: number;
  completedToday: number;
  lastCommandAt?: string;
}

async function getExecutiveSnapshot(): Promise<ExecutiveSnapshot | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/executive-ops/snapshot`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch snapshot');
    return await res.json();
  } catch {
    return null;
  }
}

export default function ExecutiveOpsPage() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getExecutiveSnapshot().then(data => {
      setSnapshot(data);
      setLoading(false);
      setDataSource(data ? 'live' : 'unavailable');
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const totalActionItems = (snapshot?.pendingApprovals || 0) + (snapshot?.pendingDecisions || 0) + (snapshot?.pendingFollowups || 0);

  const quickNavItems = [
    { href: '/executive-ops/calendar', label: 'Calendar', icon: Calendar, description: 'Schedule & availability', count: snapshot?.meetingsToday, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { href: '/executive-ops/decisions', label: 'Decisions', icon: GitBranch, description: 'Decision pipeline', count: snapshot?.pendingDecisions, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { href: '/executive-ops/watchlist', label: 'Watchlist', icon: Eye, description: 'Priority tracking', count: snapshot?.watchlistItems, color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    { href: '/executive-ops/approvals', label: 'Approvals', icon: CheckCircle2, description: 'Pending approvals', count: snapshot?.pendingApprovals, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { href: '/executive-ops/followups', label: 'Follow-ups', icon: Clock, description: 'Action items', count: snapshot?.pendingFollowups, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    { href: '/executive-ops/commands', label: 'Commands', icon: Terminal, description: 'Quick commands', count: undefined, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Executive Ops</h1>
              <p className="text-sm text-[#6B7280]">{formatDate(currentTime)} • {formatTime(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {totalActionItems > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg">
                <Zap className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-sm text-[#FF6A00]">{totalActionItems} items need attention</span>
              </div>
            )}
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <div className="w-2 h-2 rounded-full bg-[#16C784] animate-pulse" />
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

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatPill icon={<Target className="w-4 h-4" />} label="Priorities" value={snapshot?.priorities?.length} loading={loading} color="text-[#FF3B30]" />
          <StatPill icon={<Calendar className="w-4 h-4" />} label="Meetings" value={snapshot?.meetingsToday} loading={loading} color="text-[#3B82F6]" />
          <StatPill icon={<GitBranch className="w-4 h-4" />} label="Decisions" value={snapshot?.pendingDecisions} loading={loading} color="text-[#FFB020]" />
          <StatPill icon={<Eye className="w-4 h-4" />} label="Watchlist" value={snapshot?.watchlistItems} loading={loading} color="text-[#16C784]" />
          <StatPill icon={<CheckCircle2 className="w-4 h-4" />} label="Approvals" value={snapshot?.pendingApprovals} loading={loading} color="text-[#10B981]" />
          <StatPill icon={<Clock className="w-4 h-4" />} label="Follow-ups" value={snapshot?.pendingFollowups} loading={loading} color="text-[#F59E0B]" />
        </div>

        {/* Quick Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Quick Access</h2>
            <span className="text-xs text-[#6B7280]">{quickNavItems.length} modules</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group flex items-center gap-4 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#FF6A00]/50 hover:bg-[#1F2226] transition-all">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="px-2 py-0.5 bg-[#FF6A00]/20 text-[#FF6A00] text-xs rounded-full shrink-0">{item.count}</span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B7280] truncate">{item.description}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[#6B7280] group-hover:text-[#FF6A00] opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Section - Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#6B7280]" />
              <span className="text-sm font-medium text-white">System Status</span>
            </div>
            <div className="space-y-3">
              <StatusRow label="API Connectivity" status="operational" />
              <StatusRow label="Calendar Sync" status="operational" />
              <StatusRow label="Decision Engine" status="operational" />
              <StatusRow label="Notification Service" status={dataSource === 'live' ? 'operational' : 'degraded'} />
            </div>
          </div>

          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#6B7280]" />
                <span className="text-sm font-medium text-white">Quick Actions</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-white transition-colors text-left">
                <span className="block text-[#6B7280] text-xs mb-1">New</span>
                Schedule Meeting
              </button>
              <button className="p-3 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-white transition-colors text-left">
                <span className="block text-[#6B7280] text-xs mb-1">New</span>
                Create Decision
              </button>
              <button className="p-3 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-white transition-colors text-left">
                <span className="block text-[#6B7280] text-xs mb-1">View</span>
                Pending Approvals
              </button>
              <button className="p-3 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-white transition-colors text-left">
                <span className="block text-[#6B7280] text-xs mb-1">View</span>
                Overdue Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, loading, color }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; color: string }) {
  return (
    <div className="p-3 bg-[#111214] border border-[#1F2226] rounded-lg">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>{icon}<span className="text-xs text-[#6B7280]">{label}</span></div>
      {loading ? <Loader2 className="w-4 h-4 text-[#6B7280] animate-spin" /> : <p className="text-xl font-bold text-white">{value || 0}</p>}
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: 'operational' | 'degraded' | 'down' }) {
  const colors = {
    operational: 'bg-[#16C784]',
    degraded: 'bg-[#FFB020]',
    down: 'bg-[#FF3B30]',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1F2226] last:border-0">
      <span className="text-sm text-[#9BA3AF]">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span className="text-xs text-[#6B7280] capitalize">{status}</span>
      </div>
    </div>
  );
}
