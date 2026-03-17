'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, Calendar, GitBranch, Eye, Terminal, Target, Clock, CheckCircle2,
  Loader2, AlertCircle, Zap, ArrowUpRight, Bell, Send, Mic, Plus
} from 'lucide-react';

interface ExecutiveSnapshot {
  priorities: any[];
  meetingsToday: number;
  pendingDecisions: number;
  watchlistItems: number;
  pendingApprovals: number;
  pendingFollowups: number;
  unreadNotifications: number;
  unreadWhatsApp?: number;
  activeMissionCount?: number;
  source?: string;
  build_marker?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  createdAt: string;
  read: boolean;
}

interface Decision {
  id: string;
  title: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  dueDate?: string;
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
    if (!res.ok) return [];
    const data = await res.json();
    return data.notifications || [];
  } catch { return []; }
}

async function getDecisions(): Promise<Decision[]> {
  try {
    const res = await fetch('/api/decisions?limit=3', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.decisions || [];
  } catch { return []; }
}

function StatCard({ icon: Icon, label, value, loading }: { icon: any; label: string; value?: number; loading: boolean }) {
  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <span className="text-xs text-[#6B7280]">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{loading ? '-' : (value || 0)}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ExecutiveOpsPage() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [commandInput, setCommandInput] = useState('');

  useEffect(() => {
    Promise.all([
      getExecutiveSnapshot(),
      getNotifications(),
      getDecisions()
    ]).then(([snap, notifs, decs]) => {
      setSnapshot(snap);
      setNotifications(notifs);
      setDecisions(decs);
      setLoading(false);
      setDataSource(snap?.source === 'live' ? 'live' : 'unavailable');
    });
  }, []);

  const totalActionItems = (snapshot?.pendingApprovals || 0) + (snapshot?.pendingDecisions || 0) + (snapshot?.pendingFollowups || 0);
  const unreadCount = notifications.filter(n => !n.read).length;

  const quickNavItems = [
    { href: '/executive-ops/calendar', label: 'Calendar', icon: Calendar, count: snapshot?.meetingsToday, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400' },
    { href: '/executive-ops/watchlist', label: 'Watchlist', icon: Eye, count: snapshot?.watchlistItems, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400' },
    { href: '/executive-ops/approvals', label: 'Approvals', icon: CheckCircle2, count: snapshot?.pendingApprovals, color: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400' },
    { href: '/executive-ops/followups', label: 'Follow-ups', icon: Clock, count: snapshot?.pendingFollowups, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header - Knowledge Pattern */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Executive Ops</h1>
              <p className="text-sm text-[#6B7280]">Daily operations & decision center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded text-xs text-[#FF3B30]">{unreadCount} new</span>
            )}
            {totalActionItems > 0 && (
              <span className="px-2 py-1 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded text-xs text-[#FF6A00]">{totalActionItems} pending</span>
            )}
            <span className={`px-2 py-1 border rounded text-xs ${dataSource === 'live' ? 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]' : 'bg-[#6B7280]/10 border-[#6B7280]/30 text-[#6B7280]'}`}>
              {dataSource === 'live' ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Stats - Knowledge Pattern */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <StatCard icon={Target} label="Priorities" value={snapshot?.priorities?.length} loading={loading} />
          <StatCard icon={Calendar} label="Meetings" value={snapshot?.meetingsToday} loading={loading} />
          <StatCard icon={GitBranch} label="Decisions" value={snapshot?.pendingDecisions} loading={loading} />
          <StatCard icon={Eye} label="Watchlist" value={snapshot?.watchlistItems} loading={loading} />
          <StatCard icon={CheckCircle2} label="Approvals" value={snapshot?.pendingApprovals} loading={loading} />
          <StatCard icon={Clock} label="Follow-ups" value={snapshot?.pendingFollowups} loading={loading} />
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📱</span>
              <span className="text-xs text-[#6B7280]">WhatsApp</span>
            </div>
            <p className="text-2xl font-semibold text-white">{loading ? '-' : (snapshot?.unreadWhatsApp || 0)}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Access Cards - Knowledge Pattern */}
            <div>
              <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={`group p-5 bg-gradient-to-br ${item.color} rounded-[10px] hover:opacity-90 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">{item.count}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white mb-1">{item.label}</h3>
                      <p className="text-sm text-white/60">Click to view {item.label.toLowerCase()}</p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Decisions */}
            <SectionCard title="Pending Decisions" icon={GitBranch} action={
              <button className="flex items-center gap-1 px-2 py-1 text-xs text-[#6B7280] hover:text-white bg-[#1F2226] rounded hover:bg-[#2A2D32] transition-colors">
                <Plus className="w-3 h-3" /> New
              </button>
            }>
              {decisions.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-4">No pending decisions</p>
              ) : (
                <div className="space-y-2">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="flex items-center gap-3 p-3 bg-[#1F2226] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        decision.impact === 'critical' ? 'bg-[#FF3B30]' :
                        decision.impact === 'high' ? 'bg-[#FF6A00]' :
                        decision.impact === 'medium' ? 'bg-[#FFB020]' : 'bg-[#16C784]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{decision.title}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded bg-[#2A2D32] text-[#9BA3AF] capitalize">{decision.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Commands */}
            <SectionCard title="Voice & Text Commands" icon={Terminal}>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="Type a command or use voice..."
                    className="w-full px-3 py-2 bg-[#1F2226] border border-[#2A2D32] rounded-lg text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00]/50"
                  />
                  <Mic className="absolute right-3 top-2.5 w-4 h-4 text-[#6B7280]" />
                </div>
                <button className="px-3 py-2 bg-[#FF6A00]/20 border border-[#FF6A00]/30 rounded-lg text-[#FF6A00] hover:bg-[#FF6A00]/30 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 bg-[#1F2226] rounded-lg">
                <p className="text-sm text-[#6B7280] italic">&quot;Create task to follow up with TechCorp&quot;</p>
                <p className="text-xs text-[#3B82F6] mt-1">create_task(subject: TechCorp)</p>
                <p className="text-xs text-[#6B7280]">92% confidence • pending</p>
              </div>
            </SectionCard>
          </div>

          {/* Right Column: Notifications */}
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
                      {/* Source Icon */}
                      {notif.source === 'whatsapp' ? (
                        <span className="text-sm mt-0.5">📱</span>
                      ) : (
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.type === 'urgent' ? 'bg-[#FF3B30]' : notif.type === 'warning' ? 'bg-[#FFB020]' : 'bg-[#3B82F6]'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                          {notif.source === 'whatsapp' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#16C784]/20 text-[#16C784] rounded">WhatsApp</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] truncate">{notif.message}</p>
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
