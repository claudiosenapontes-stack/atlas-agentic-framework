'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Calendar, 
  GitBranch, 
  Eye, 
  Terminal, 
  Settings,
  ChevronRight,
  Plus,
  Target,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { RealmSubnav } from '@/components/ui/realm-subnav';

interface ExecutiveSnapshot {
  date: string;
  priorities: any[];
  meetingsToday: number;
  pendingDecisions: number;
  watchlistItems: number;
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

// Subnav items for Executive Ops realm
const executiveOpsNavItems = [
  { href: '/executive-ops', label: 'Overview', icon: Briefcase },
  { href: '/executive-ops/calendar', label: 'Calendar & Meetings', icon: Calendar },
  { href: '/executive-ops/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/executive-ops/approvals', label: 'Approvals', icon: CheckCircle2 },
  { href: '/executive-ops/followups', label: 'Follow-ups', icon: Clock },
  { href: '/executive-ops/commands', label: 'Commands', icon: Terminal },
  { href: '/executive-ops/decisions', label: 'Decisions', icon: GitBranch },
];

export default function ExecutiveOpsPage() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getExecutiveSnapshot().then(data => {
      setSnapshot(data);
      setLoading(false);
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
    { 
      href: '/executive-ops/calendar', 
      label: 'Calendar', 
      icon: Calendar,
      description: 'Schedule & availability',
      count: snapshot?.meetingsToday
    },
    { 
      href: '/executive-ops/decisions', 
      label: 'Decisions', 
      icon: GitBranch,
      description: 'Decision pipeline',
      count: snapshot?.pendingDecisions
    },
    { 
      href: '/executive-ops/watchlist', 
      label: 'Watchlist', 
      icon: Eye,
      description: 'Priority tracking',
      count: snapshot?.watchlistItems
    },
    { 
      href: '/executive-ops/commands', 
      label: 'Commands', 
      icon: Terminal,
      description: 'Voice & quick commands',
      count: undefined
    },
    { 
      href: '/executive-ops/settings', 
      label: 'Settings', 
      icon: Settings,
      description: 'Preferences & integrations',
      count: undefined
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      {/* Realm Subnav */}
      <RealmSubnav 
        realm="Executive Ops" 
        realmHref="/executive-ops"
        items={executiveOpsNavItems}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Executive Ops</h1>
            <p className="text-sm text-[#6B7280]">{formatDate(currentTime)}</p>
          </div>
        </div>

        {/* Today's Snapshot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Priority Stack Preview */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-sm font-medium text-white">Priorities</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : snapshot?.priorities && snapshot.priorities.length > 0 ? (
              <div>
                <p className="text-2xl font-bold text-white">{snapshot.priorities.length}</p>
                <p className="text-xs text-[#6B7280] mt-1">P0/P1 tasks requiring attention</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#9BA3AF]">No P0/P1 tasks</p>
                <p className="text-xs text-[#6B7280] mt-1">Check Tasks page for all items</p>
              </div>
            )}
          </div>

          {/* Calendar Preview */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-sm font-medium text-white">Today</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : snapshot?.meetingsToday ? (
              <div>
                <p className="text-2xl font-bold text-white">{snapshot.meetingsToday}</p>
                <p className="text-xs text-[#6B7280] mt-1">Meetings scheduled today</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#9BA3AF]">No meetings</p>
                <p className="text-xs text-[#6B7280] mt-1">Free day ahead</p>
              </div>
            )}
          </div>

          {/* Decisions Preview */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-[#FFB020]" />
              <span className="text-sm font-medium text-white">Decisions</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : snapshot?.pendingDecisions ? (
              <div>
                <p className="text-2xl font-bold text-white">{snapshot.pendingDecisions}</p>
                <p className="text-xs text-[#6B7280] mt-1">Pending decisions</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#9BA3AF]">No pending decisions</p>
                <p className="text-xs text-[#6B7280] mt-1">Pipeline clear</p>
              </div>
            )}
          </div>

          {/* Watchlist Preview */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-[#16C784]" />
              <span className="text-sm font-medium text-white">Watchlist</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : snapshot?.watchlistItems ? (
              <div>
                <p className="text-2xl font-bold text-white">{snapshot.watchlistItems}</p>
                <p className="text-xs text-[#6B7280] mt-1">Items on watchlist</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#9BA3AF]">Watchlist empty</p>
                <p className="text-xs text-[#6B7280] mt-1">Add items to track</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#FF6A00]/50 hover:bg-[#1F2226] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1F2226] border border-[#2A2D32] flex items-center justify-center group-hover:bg-[#FF6A00]/10 group-hover:border-[#FF6A00]/30 transition-colors"
                >
                  <Icon className="w-5 h-5 text-[#6B7280] group-hover:text-[#FF6A00]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-2 py-0.5 bg-[#FF6A00]/20 text-[#FF6A00] text-xs rounded-full">
                        {item.count}
                      </span>
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
