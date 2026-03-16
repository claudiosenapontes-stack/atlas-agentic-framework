'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, Calendar, GitBranch, Eye, Terminal, Target, Clock, CheckCircle2,
  Loader2, AlertCircle, Zap, ArrowUpRight, Bell, Users
} from 'lucide-react';

interface ExecutiveSnapshot {
  priorities: any[];
  meetingsToday: number;
  pendingDecisions: number;
  watchlistItems: number;
  pendingApprovals: number;
  pendingFollowups: number;
  unreadNotifications: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  createdAt: string;
  read: boolean;
}

async function getExecutiveSnapshot(): Promise<ExecutiveSnapshot | null> {
  try {
    const res = await fetch('/api/executive-ops/snapshot', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch { return null; }
}

async function getNotifications(): Promise<Notification[]> {
  try {
    const res = await fetch('/api/notifications?limit=5', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data.notifications || [];
  } catch { return []; }
}

export default function ExecutiveOpsPage() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    Promise.all([getExecutiveSnapshot(), getNotifications()]).then(([snap, notifs]) => {
      setSnapshot(snap);
      setNotifications(notifs);
      setLoading(false);
      setDataSource(snap ? 'live' : 'unavailable');
    });
  }, []);

  const totalActionItems = (snapshot?.pendingApprovals || 0) + (snapshot?.pendingDecisions || 0) + (snapshot?.pendingFollowups || 0);
  const unreadCount = notifications.filter(n => !n.read).length;

  const quickNavItems = [
    { href: '/executive-ops/calendar', label: 'Calendar', icon: Calendar, count: snapshot?.meetingsToday, urgent: false },
    { href: '/executive-ops/decisions', label: 'Decisions', icon: GitBranch, count: snapshot?.pendingDecisions, urgent: (snapshot?.pendingDecisions || 0) > 5 },
    { href: '/executive-ops/watchlist', label: 'Watchlist', icon: Eye, count: snapshot?.watchlistItems, urgent: false },
    { href: '/executive-ops/approvals', label: 'Approvals', icon: CheckCircle2, count: snapshot?.pendingApprovals, urgent: (snapshot?.pendingApprovals || 0) > 3 },
    { href: '/executive-ops/followups', label: 'Follow-ups', icon: Clock, count: snapshot?.pendingFollowups, urgent: (snapshot?.pendingFollowups || 0) > 5 },
    { href: '/executive-ops/commands', label: 'Commands', icon: Terminal, count: undefined, urgent: false },
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
              <p className="text-sm text-[#6B7280]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button className="flex items-center gap-2 px-3 py-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg">
                <Bell className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-sm text-[#FF3B30]">{unreadCount} new</span>
              </button>
            )}
            {totalActionItems > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg">
                <Zap className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-sm text-[#FF6A00]">{totalActionItems} pending</span>
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
                <span className="text-xs text-[#6B7280]">OFFLINE</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatPill icon={<Target className="w-4 h-4" />} label="Priorities" value={snapshot?.priorities?.length} loading={loading} color="text-[#FF3B30]" />
          <StatPill icon={<Calendar className="w-4 h-4" />} label="Meetings" value={snapshot?.meetingsToday} loading={loading} color="text-[#3B82F6]" />
          <StatPill icon={<GitBranch className="w-4 h-4" />} label="Decisions" value={snapshot?.pendingDecisions} loading={loading} color="text-[#FFB020]" />
          <StatPill icon={<Eye className="w-4 h-4" />} label="Watchlist" value={snapshot?.watchlistItems} loading={loading} color="text-[#16C784]" />
          <StatPill icon={<CheckCircle2 className="w-4 h-4" />} label="Approvals" value={snapshot?.pendingApprovals} loading={loading} color="text-[#10B981]" />
          <StatPill icon={<Clock className="w-4 h-4" />} label="Follow-ups" value={snapshot?.pendingFollowups} loading={loading} color="text-[#F59E0B]" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Navigation */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Operations</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={`group flex items-center gap-4 p-4 bg-[#111214] border rounded-[10px] hover:border-[#FF6A00]/50 hover:bg-[#1F2226] transition-all ${item.urgent ? 'border-[#FF3B30]/50' : 'border-[#1F2226]'}`}>
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${item.urgent ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]' : 'bg-[#1F2226] border-[#2A2D32] text-[#6B7280] group-hover:text-[#FF6A00]'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${item.urgent ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-[#FF6A00]/20 text-[#FF6A00]'}`}>{item.count}</span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B7280] truncate">Click to view {item.label.toLowerCase()}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-[#6B7280] group-hover:text-[#FF6A00] opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#6B7280]" />
                <span className="text-sm font-medium text-white">Notifications</span>
              </div>
              {unreadCount > 0 && <span className="px-2 py-0.5 bg-[#FF3B30]/20 text-[#FF3B30] text-xs rounded-full">{unreadCount}</span>}
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-4">No new notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`p-3 rounded-lg border ${notif.read ? 'bg-[#1F2226] border-[#2A2D32]' : 'bg-[#FF6A00]/5 border-[#FF6A00]/20'}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.type === 'urgent' ? 'bg-[#FF3B30]' : notif.type === 'warning' ? 'bg-[#FFB020]' : 'bg-[#3B82F6]'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-[#6B7280]">{notif.message}</p>
                        <p className="text-xs text-[#6B7280] mt-1">{new Date(notif.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
