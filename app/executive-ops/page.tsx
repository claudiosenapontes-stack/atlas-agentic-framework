'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Calendar, 
  GitBranch, 
  Eye, 
  Terminal, 
  ChevronRight,
  Target,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ExecutiveSnapshot {
  date: string;
  priorities: any[];
  meetingsToday: number;
  pendingDecisions: number;
  watchlistItems: number;
  pendingApprovals: number;
  pendingFollowups: number;
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
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const quickNavItems = [
    { href: '/executive-ops/calendar', label: 'Calendar', icon: Calendar, description: 'Schedule & availability', count: snapshot?.meetingsToday },
    { href: '/executive-ops/decisions', label: 'Decisions', icon: GitBranch, description: 'Decision pipeline', count: snapshot?.pendingDecisions },
    { href: '/executive-ops/watchlist', label: 'Watchlist', icon: Eye, description: 'Priority tracking', count: snapshot?.watchlistItems },
    { href: '/executive-ops/approvals', label: 'Approvals', icon: CheckCircle2, description: 'Pending approvals', count: snapshot?.pendingApprovals },
    { href: '/executive-ops/followups', label: 'Follow-ups', icon: Clock, description: 'Action items & reminders', count: snapshot?.pendingFollowups },
    { href: '/executive-ops/commands', label: 'Commands', icon: Terminal, description: 'Voice & quick commands', count: undefined },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Executive Ops</h1>
              <p className="text-sm text-[#6B7280]">{formatDate(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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

        {/* Snapshot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SnapshotCard icon={<Target className="w-4 h-4 text-[#FF3B30]" />} label="Priorities" value={snapshot?.priorities?.length} loading={loading} emptyText="No P0/P1 tasks" />
          <SnapshotCard icon={<Calendar className="w-4 h-4 text-[#3B82F6]" />} label="Today" value={snapshot?.meetingsToday} loading={loading} emptyText="No meetings" />
          <SnapshotCard icon={<GitBranch className="w-4 h-4 text-[#FFB020]" />} label="Decisions" value={snapshot?.pendingDecisions} loading={loading} emptyText="No pending decisions" />
          <SnapshotCard icon={<Eye className="w-4 h-4 text-[#16C784]" />} label="Watchlist" value={snapshot?.watchlistItems} loading={loading} emptyText="Watchlist empty" />
        </div>

        {/* Quick Nav Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group flex items-center gap-4 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#FF6A00]/50 hover:bg-[#1F2226] transition-all">
                <div className="w-10 h-10 rounded-lg bg-[#1F2226] border border-[#2A2D32] flex items-center justify-center group-hover:bg-[#FF6A00]/10 group-hover:border-[#FF6A00]/30 transition-colors">
                  <Icon className="w-5 h-5 text-[#6B7280] group-hover:text-[#FF6A00]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-2 py-0.5 bg-[#FF6A00]/20 text-[#FF6A00] text-xs rounded-full">{item.count}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#6B7280]">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6B7280] group-hover:text-white" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ icon, label, value, loading, emptyText }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; emptyText: string }) {
  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-sm font-medium text-white">{label}</span></div>
      {loading ? (
        <div className="flex items-center gap-2 text-[#6B7280]"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span></div>
      ) : value ? (
        <div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-[#6B7280] mt-1">{label.toLowerCase()} items</p></div>
      ) : (
        <div><p className="text-sm text-[#9BA3AF]">{emptyText}</p></div>
      )}
    </div>
  );
}
