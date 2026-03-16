'use client';

import { useState, useEffect } from 'react';
import { DollarSign, LayoutDashboard, PieChart, FileText, Scale, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import Link from 'next/link';

interface FinanceSnapshot {
  totalBudget: number;
  spentYTD: number;
  pendingApprovals: number;
  outstandingInvoices: number;
  activeContracts: number;
}

export default function FinancePage() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchSnapshot();
  }, []);

  async function fetchSnapshot() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/snapshot', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Finance] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#16C784]/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#16C784]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Finance Overview</h1>
              <p className="text-sm text-[#6B7280]">Budget and legal operations</p>
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
            <button 
              onClick={fetchSnapshot} 
              disabled={loading} 
              className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Finance System Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The finance backend is not yet available. Budget tracking, approvals, invoices, and contract management will appear once the service is deployed.
            </p>
            <button onClick={fetchSnapshot} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : snapshot && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Total Budget" value={`$${snapshot.totalBudget.toLocaleString()}`} color="green" />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Spent YTD" value={`$${snapshot.spentYTD.toLocaleString()}`} color="blue" />
            <MetricCard icon={<FileText className="w-4 h-4" />} label="Pending Approvals" value={snapshot.pendingApprovals} color="amber" />
            <MetricCard icon={<FileText className="w-4 h-4" />} label="Outstanding Invoices" value={snapshot.outstandingInvoices} color="red" />
            <MetricCard icon={<Scale className="w-4 h-4" />} label="Active Contracts" value={snapshot.activeContracts} color="purple" />
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: 'green' | 'blue' | 'amber' | 'red' | 'purple' }) {
  const colors = { green: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', blue: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30', amber: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30', red: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30', purple: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30' };
  return (
    <div className={`p-4 rounded-[10px] border bg-[#111214] ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs opacity-80">{label}</span></div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
