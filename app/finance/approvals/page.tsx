'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Zap, LayoutDashboard, PieChart, FileText, Scale, AlertCircle, RefreshCw, Radio, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Approval {
  id: string;
  title: string;
  amount: number;
  requester: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export default function FinanceApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => { fetchApprovals(); }, []);

  async function fetchApprovals() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/approvals', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[FinanceApprovals] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: '/finance', label: 'Overview', icon: LayoutDashboard },
    { href: '/finance/budgets', label: 'Budgets', icon: PieChart },
    { href: '/finance/approvals', label: 'Approvals', icon: DollarSign },
    { href: '/finance/invoices', label: 'Invoices', icon: FileText },
    { href: '/finance/contracts', label: 'Contracts', icon: Scale },
    { href: '/finance/legal-privilege', label: 'Legal Privilege', icon: Scale },
  ];

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const pendingAmount = approvals.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Finance & Legal</h1>
              <p className="text-[10px] text-[#6B7280]">Budget & Contract Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
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
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/finance/approvals';
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${isActive ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>
                <Icon className="w-3.5 h-3.5" />{item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFB020]/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#FFB020]" /></div>
            <div>
              <h1 className="text-xl font-semibold text-white">Finance Approvals</h1>
              <p className="text-sm text-[#6B7280]">Pending expense approvals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-lg">
              <Clock className="w-4 h-4 text-[#FFB020]" />
              <span className="text-xs text-[#FFB020]">{pendingCount} (${pendingAmount.toLocaleString()})</span>
            </div>
            <button onClick={fetchApprovals} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4"><DollarSign className="w-8 h-8 text-[#6B7280]" /></div>
            <h2 className="text-lg font-medium text-white mb-2">Approval System Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">Finance approval workflow is not yet available. Expense requests will appear once the service is deployed.</p>
            <button onClick={fetchApprovals} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">{loading ? 'Checking...' : 'Check Connection'}</button>
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <Check className="w-8 h-8 text-[#16C784] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No pending approvals</p>
            <p className="text-xs text-[#6B7280] mt-1">All expense requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((a) => (
              <ApprovalRow key={a.id} approval={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ApprovalRow({ approval }: { approval: Approval }) {
  const statusColors = { pending: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30', approved: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', rejected: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30' };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#111214] border border-[#1F2226] rounded-lg">
      <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[approval.status]}`}>{approval.status}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{approval.title}</p>
        <p className="text-[10px] text-[#6B7280]">{approval.requester} • {approval.category}</p>
      </div>
      <span className="text-sm font-medium text-white">${approval.amount.toLocaleString()}</span>
      <span className="text-[10px] text-[#6B7280]">{new Date(approval.requestedAt).toLocaleDateString()}</span>
    </div>
  );
}
