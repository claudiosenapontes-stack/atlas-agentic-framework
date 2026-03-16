'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Loader2, AlertCircle, Calendar, User, ArrowRight } from 'lucide-react';

interface FollowUp {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  source: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

async function getFollowUps(): Promise<FollowUp[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/followups`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch follow-ups');
    return await res.json();
  } catch {
    return null;
  }
}

const PRIORITY_COLORS = {
  low: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  medium: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  high: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
};

const STATUS_COLORS = {
  pending: 'bg-[#FFB020]/10 text-[#FFB020]',
  completed: 'bg-[#16C784]/10 text-[#16C784]',
  overdue: 'bg-[#FF3B30]/10 text-[#FF3B30]',
};

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');

  useEffect(() => {
    fetchFollowups();
  }, []);

  async function fetchFollowups() {
    setLoading(true);
    try {
      const data = await getFollowUps();
      if (data) {
        setFollowups(data);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
        setFollowups([]);
      }
    } catch {
      setDataSource('unavailable');
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredFollowups = followups?.filter(f => {
    if (filter === 'all') return true;
    return f.status === filter;
  }) || [];

  const pendingCount = followups?.filter(f => f.status === 'pending').length || 0;
  const overdueCount = followups?.filter(f => f.status === 'overdue').length || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FFB020]/20 to-[#FFB020]/10 border border-[#FFB020]/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#FFB020]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Follow-ups</h1>
              <p className="text-sm text-[#6B7280]">Track pending actions and reminders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-xs text-[#FF3B30]">{overdueCount} overdue</span>
              </div>
            )}
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <div className="w-2 h-2 rounded-full bg-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <span className="text-xs text-[#6B7280]">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['pending', 'overdue', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-[#1F2226] text-white'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
            <span className="ml-2 text-[#6B7280]">Loading follow-ups...</span>
          </div>
        ) : dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Clock className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">Follow-up system not connected</p>
            <p className="text-xs text-[#6B7280] mt-1">Awaiting backend integration</p>
          </div>
        ) : filteredFollowups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <CheckCircle2 className="w-8 h-8 text-[#16C784] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No {filter === 'all' ? '' : filter} follow-ups</p>
            <p className="text-xs text-[#6B7280] mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFollowups.map((followup) => (
              <FollowUpCard key={followup.id} followup={followup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpCard({ followup }: { followup: FollowUp }) {
  const isOverdue = followup.status === 'overdue' || (followup.status === 'pending' && new Date(followup.dueDate) < new Date());
  
  return (
    <div className={`p-4 bg-[#111214] border rounded-[10px] ${isOverdue ? 'border-[#FF3B30]/30' : 'border-[#1F2226]'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[followup.priority]}`}>
              {followup.priority.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[followup.status]}`}>
              {followup.status}
            </span>
            <span className="text-xs text-[#6B7280]">{followup.source}</span>
          </div>
          <h3 className="font-medium text-white mb-1">{followup.title}</h3>
          {followup.description && (
            <p className="text-sm text-[#6B7280] mb-2">{followup.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {followup.assignee}
            </span>
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-[#FF3B30]' : ''}`}>
              <Calendar className="w-3 h-3" />
              {new Date(followup.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {followup.status === 'pending' && (
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#16C784]/20 text-[#16C784] rounded-lg text-xs hover:bg-[#16C784]/30 transition-colors">
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </button>
        )}
      </div>
    </div>
  );
}
