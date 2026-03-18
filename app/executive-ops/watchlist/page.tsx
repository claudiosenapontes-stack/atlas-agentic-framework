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
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface WatchlistItem {
  id: string;
  name: string;
  pattern: string;
  rule_type: string;
  action_type: string;
  description: string | null;
  owner_id: string | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

async function getWatchlist(): Promise<{ items: WatchlistItem[]; error?: string }> {
  try {
    const res = await fetch('/api/watchlist', { cache: 'no-store' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { items: [], error: errData.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (!data.success) {
      return { items: [], error: data.error || 'API returned success: false' };
    }
    return { items: data.items || [] };
  } catch (err: any) {
    return { items: [], error: err.message || 'Network error' };
  }
}

async function deleteWatchlistItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      cache: 'no-store'
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: data.success || false, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

function getRulePriority(ruleType: string): 'p0' | 'p1' | 'p2' | 'p3' {
  if (ruleType === 'critical_alert' || ruleType === 'ceo_escalation') return 'p0';
  if (ruleType === 'opportunity' || ruleType === 'lead') return 'p1';
  if (ruleType === 'keyword_match') return 'p2';
  return 'p3';
}

function getItemStatus(isActive: boolean): 'on_track' | 'at_risk' | 'blocked' | 'completed' {
  if (!isActive) return 'blocked';
  return 'on_track';
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
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'p0' | 'p1' | 'blocked'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    getWatchlist().then(({ items, error }) => {
      if (!mounted) return;
      if (error) setError(error);
      setItems(items);
      setLoading(false);
    });
    
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this watch rule?')) return;
    setDeletingId(id);
    const result = await deleteWatchlistItem(id);
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      alert('Delete failed: ' + (result.error || 'Unknown error'));
    }
    setDeletingId(null);
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'blocked') return !item.is_active;
    return getRulePriority(item.rule_type) === filter;
  });

  const p0Count = items.filter(i => getRulePriority(i.rule_type) === 'p0').length;
  const blockedCount = items.filter(i => !i.is_active).length;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#16C784]/20 to-[#16C784]/10 border border-[#16C784]/30 flex items-center justify-center">
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
              {f === 'all' && `All (${items.length})`}
              {f === 'p0' && `P0 (${p0Count})`}
              {f === 'p1' && `P1 (${items.filter(i => getRulePriority(i.rule_type) === 'p1').length})`}
              {f === 'blocked' && `Blocked (${blockedCount})`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
            <span className="ml-2 text-[#6B7280]">Loading watchlist...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#FF3B30]/30 rounded-[10px]">
            <AlertCircle className="w-8 h-8 text-[#FF3B30] mb-4" />
            <p className="text-sm text-[#FF3B30]">Failed to load watchlist</p>
            <p className="text-xs text-[#6B7280] mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-[#1F2226] text-white rounded-lg text-sm hover:bg-[#2a2d32]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Eye className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">{filter === 'all' ? 'Watchlist empty' : `No ${filter} items`}</p>
            <p className="text-xs text-[#6B7280] mt-1">Add rules to track priorities</p>
          </div>
        )}

        {/* Items List */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const mappedStatus = getItemStatus(item.is_active);
              const mappedPriority = getRulePriority(item.rule_type);
              const StatusIcon = STATUS_ICONS[mappedStatus] || AlertCircle;
              const isDeleting = deletingId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#6B7280]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[mappedPriority] || PRIORITY_COLORS.p3}`}>
                          {(mappedPriority || 'p3').toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${STATUS_COLORS[mappedStatus] || STATUS_COLORS.at_risk}`}>
                          <StatusIcon className="w-3 h-3" />
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded bg-[#1F2226] text-[#6B7280]">
                          {item.rule_type}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1">{item.name}</h3>
                      <p className="text-sm text-[#6B7280] mb-2 font-mono">{item.pattern}</p>
                      {item.description && (
                        <p className="text-sm text-[#6B7280] mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                        <span>Action: {item.action_type}</span>
                        {item.owner_id && (
                          <span>Owner: {item.owner_id.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="p-2 text-[#6B7280] hover:text-[#FF3B30] disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <button className="p-2 text-[#6B7280] hover:text-white">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
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
