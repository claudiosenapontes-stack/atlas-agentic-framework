'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  X,
  FileText
} from 'lucide-react';

interface Approval {
  id: string;
  title: string;
  description: string;
  requester: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dueDate?: string;
}

async function getApprovals(): Promise<Approval[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/executive-ops/approvals`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch approvals');
    return await res.json();
  } catch {
    return null;
  }
}

const PRIORITY_COLORS = {
  low: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  medium: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  high: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
  urgent: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

const STATUS_COLORS = {
  pending: 'bg-[#FFB020]/10 text-[#FFB020]',
  approved: 'bg-[#16C784]/10 text-[#16C784]',
  rejected: 'bg-[#FF3B30]/10 text-[#FF3B30]',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    getApprovals().then(data => {
      setApprovals(data);
      setLoading(false);
    });
  }, []);

  const filteredApprovals = approvals?.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  }) || [];

  const pendingCount = approvals?.filter(a => a.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#16C784]/20 to-[#16C784]/10 border border-[#16C784]/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#16C784]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Approvals</h1>
              <p className="text-sm text-[#6B7280]">Pending approvals & decisions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-lg">
              <Clock className="w-4 h-4 text-[#FFB020]" />
              <span className="text-xs text-[#FFB020]">{pendingCount} pending</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
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
            <span className="ml-2 text-[#6B7280]">Loading approvals...</span>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <Check className="w-8 h-8 text-[#16C784] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No {filter === 'all' ? '' : filter} approvals</p>
            <p className="text-xs text-[#6B7280] mt-1">Approval requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredApprovals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const [actionLoading, setActionLoading] = useState<null | 'approve' | 'reject'>(null);

  const handleAction = async (action: 'approve' | 'reject') => {
    setActionLoading(action);
    await new Promise(r => setTimeout(r, 500));
    setActionLoading(null);
  };

  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[approval.priority]}`}>
              {approval.priority.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[approval.status]}`}>
              {approval.status}
            </span>
            <span className="text-xs text-[#6B7280]">{approval.category}</span>
          </div>
          <h3 className="font-medium text-white mb-1">{approval.title}</h3>
          {approval.description && (
            <p className="text-sm text-[#6B7280] mb-2">{approval.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
            <span>Requested by: {approval.requester}</span>
            <span>{new Date(approval.createdAt).toLocaleDateString()}</span>
            {approval.dueDate && (
              <span className="text-[#FFB020]">Due: {new Date(approval.dueDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        
        {approval.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('approve')}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#16C784]/20 text-[#16C784] rounded-lg text-xs hover:bg-[#16C784]/30 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'approve' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <><Check className="w-3 h-3" />Approve</>
              )}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#FF3B30]/20 text-[#FF3B30] rounded-lg text-xs hover:bg-[#FF3B30]/30 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'reject' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <><X className="w-3 h-3" />Reject</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
