'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  Plus,
  Loader2,
  AlertCircle,
  Target,
  AlertTriangle,
  X,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';

interface WatchlistItem {
  id: string;
  title: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  status: 'on_track' | 'at_risk' | 'blocked' | 'completed';
  owner?: string;
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

async function getWatchlist(): Promise<WatchlistItem[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/watchlist`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return await res.json();
  } catch {
    return null;
  }
}

const PRIORITY_COLORS = {
  p0: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
  p1: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
  p2: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  p3: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
};

const STATUS_COLORS = {
  on_track: 'bg-[#16C784]/10 text-[#16C784]',
  at_risk: 'bg-[#FFB020]/10 text-[#FFB020]',
  blocked: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  completed: 'bg-[#6B7280]/10 text-[#6B7280]',
};

const STATUS_ICONS = {
  on_track: CheckCircle2,
  at_risk: AlertTriangle,
  blocked: AlertCircle,
  completed: CheckCircle2,
};

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'p0' | 'p1' | 'blocked'>('all');

  useEffect(() => {
    getWatchlist().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filteredItems = items?.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'blocked') return item.status === 'blocked';
    return item.priority === filter;
  }) || [];

  const p0Count = items?.filter(i => i.priority === 'p0').length || 0;
  const blockedCount = items?.filter(i => i.status === 'blocked').length || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#16C784]/10 border border-[#16C784]/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#16C784]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Watchlist</h1>
              <p className="text-sm text-[#6B7280]">Priority tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF6A00]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'p0', 'p1', 'blocked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f
                  ? 'bg-[#1F2226] text-white'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
              }`}
            >
              {f === 'all' && `All (${items?.length || 0})`}
              {f === 'p0' && `P0 (${p0Count})`}
              {f === 'p1' && `P1 (${items?.filter(i => i.priority === 'p1').length || 0})`}
              {f === 'blocked' && `Blocked (${blockedCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
            <span className="ml-2 text-[#6B7280]">Loading watchlist...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Eye className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">{filter === 'all' ? 'Watchlist empty' : `No ${filter} items`}</p>
            <p className="text-xs text-[#6B7280] mt-1">Add items to track priorities</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const StatusIcon = STATUS_ICONS[item.status];
              return (
                <div
                  key={item.id}
                  className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#6B7280]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[item.priority]}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${STATUS_COLORS[item.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1">{item.title}</h3>
                      {item.notes && (
                        <p className="text-sm text-[#6B7280] mb-2">{item.notes}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3B82F6] hover:underline"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                    <button className="p-2 text-[#6B7280] hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
