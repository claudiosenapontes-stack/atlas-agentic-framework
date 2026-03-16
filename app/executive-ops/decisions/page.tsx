'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase,
  Calendar,
  GitBranch, 
  Eye,
  Terminal,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  Users,
  X,
  ChevronLeft
} from 'lucide-react';
import { RealmSubnav } from '@/components/ui/realm-subnav';

interface Decision {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'pending' | 'review' | 'approved' | 'rejected' | 'deferred';
  createdBy: string;
  stakeholders: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

async function getDecisions(): Promise<Decision[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/decisions`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch decisions');
    return await res.json();
  } catch {
    return null;
  }
}

const IMPACT_COLORS = {
  low: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  medium: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  high: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
  critical: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

const STATUS_COLORS = {
  draft: 'bg-[#6B7280]/10 text-[#6B7280]',
  pending: 'bg-[#FFB020]/10 text-[#FFB020]',
  review: 'bg-[#3B82F6]/10 text-[#3B82F6]',
  approved: 'bg-[#16C784]/10 text-[#16C784]',
  rejected: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  deferred: 'bg-[#6B7280]/10 text-[#6B7280]',
};

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

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'review'>('all');

  useEffect(() => {
    getDecisions().then(data => {
      setDecisions(data);
      setLoading(false);
    });
  }, []);

  const filteredDecisions = decisions?.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  }) || [];

  const pendingCount = decisions?.filter(d => d.status === 'pending').length || 0;
  const reviewCount = decisions?.filter(d => d.status === 'review').length || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      {/* Realm Subnav */}
      <RealmSubnav 
        realm="Executive Ops" 
        realmHref="/executive-ops"
        items={executiveOpsNavItems}
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFB020]/10 border border-[#FFB020]/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-[#FFB020]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Decisions</h1>
              <p className="text-sm text-[#6B7280]">Decision pipeline</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF6A00]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Decision
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
          </div>
        ) : decisions === null ? (
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-8 text-center">
            <div className="w-16 h-16 rounded-[10px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#FF3B30]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Decision backend unavailable</h2>
            <p className="text-[#9BA3AF] mb-4">
              The decision tracking system is not yet configured.
            </p>
            <p className="text-sm text-[#6B7280]">
              Backend endpoint <code className="bg-[#0B0B0C] px-2 py-1 rounded">/api/decisions</code> returned an error.
            </p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-8 text-center">
            <div className="w-16 h-16 rounded-[10px] bg-[#FFB020]/10 border border-[#FFB020]/20 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-8 h-8 text-[#FFB020]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">No decisions tracked</h2>
            <p className="text-[#9BA3AF] mb-6 max-w-md mx-auto">
              Create your first decision to track stakeholder input and approval status.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF6A00]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Decision
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <p className="text-2xl font-bold text-white">{decisions.length}</p>
                <p className="text-xs text-[#6B7280]">Total decisions</p>
              </div>
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <p className="text-2xl font-bold text-[#FFB020]">{pendingCount}</p>
                <p className="text-xs text-[#6B7280]">Pending</p>
              </div>
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <p className="text-2xl font-bold text-[#3B82F6]">{reviewCount}</p>
                <p className="text-xs text-[#6B7280]">In review</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4">
              {(['all', 'pending', 'review'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filter === f 
                      ? 'bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/30' 
                      : 'text-[#9BA3AF] hover:text-white hover:bg-[#1F2226]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-[#FFB020] text-[#0B0B0C] text-xs rounded">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Decision Cards */}
            {filteredDecisions.map((decision) => (
              <div 
                key={decision.id}
                className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4 hover:border-[#6B7280]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${IMPACT_COLORS[decision.impact]}`}>
                      {decision.impact.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[decision.status]}`}>
                      {decision.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {decision.dueDate && (
                    <div className={`flex items-center gap-1 text-xs ${
                      new Date(decision.dueDate) < new Date() ? 'text-[#FF3B30]' : 'text-[#6B7280]'
                    }`}>
                      <Clock className="w-3 h-3" />
                      Due {new Date(decision.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <h3 className="font-medium text-white mb-1">{decision.title}</h3>
                {decision.description && (
                  <p className="text-sm text-[#9BA3AF] mb-3">{decision.description}</p>
                )}

                {decision.stakeholders.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Users className="w-4 h-4" />
                    <span>Stakeholders: {decision.stakeholders.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1F2226]">
                  <button className="px-3 py-1.5 text-sm text-[#9BA3AF] hover:text-white transition-colors">
                    View Details
                  </button>
                  {decision.status === 'pending' && (
                    <button className="px-3 py-1.5 text-sm text-[#3B82F6] hover:text-white transition-colors">
                      Move to Review
                    </button>
                  )}
                  {decision.status === 'review' && (
                    <>
                      <button className="px-3 py-1.5 text-sm text-[#16C784] hover:text-white transition-colors">
                        Approve
                      </button>
                      <button className="px-3 py-1.5 text-sm text-[#FF3B30] hover:text-white transition-colors">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredDecisions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[#9BA3AF]">No {filter} decisions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Decision Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-[#1F2226]">
              <h2 className="text-lg font-medium text-white">New Decision</h2>
              <button 
                onClick={() => setShowNewForm(false)}
                className="p-2 hover:bg-[#1F2226] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#9BA3AF]" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#9BA3AF] mb-1">Title</label>
                <input 
                  type="text"
                  placeholder="What decision needs to be made?"
                  className="w-full px-3 py-2 bg-[#0B0B0C] border border-[#1F2226] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9BA3AF] mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Provide context for this decision..."
                  className="w-full px-3 py-2 bg-[#0B0B0C] border border-[#1F2226] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#9BA3AF] mb-1">Impact</label>
                  <select className="w-full px-3 py-2 bg-[#0B0B0C] border border-[#1F2226] rounded-lg text-white focus:outline-none focus:border-[#FF6A00]">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#9BA3AF] mb-1">Due Date</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-[#0B0B0C] border border-[#1F2226] rounded-lg text-white focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[#1F2226]">
                <button 
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-sm text-[#9BA3AF] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF6A00]/90 transition-colors">
                  Create Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
