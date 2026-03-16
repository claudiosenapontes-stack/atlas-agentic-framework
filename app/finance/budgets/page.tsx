'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Zap, LayoutDashboard, PieChart, FileText, Scale, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import Link from 'next/link';

interface Budget {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  category: string;
  owner: string;
  status: 'active' | 'frozen' | 'exceeded';
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => { fetchBudgets(); }, []);

  async function fetchBudgets() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/budgets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Budgets] Error:', err);
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
            const isActive = item.href === '/finance/budgets';
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
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center"><PieChart className="w-5 h-5 text-[#8B5CF6]" /></div>
            <div>
              <h1 className="text-xl font-semibold text-white">Budget Tracking</h1>
              <p className="text-sm text-[#6B7280]">Monitor departmental budgets</p>
            </div>
          </div>
          <button onClick={fetchBudgets} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4"><PieChart className="w-8 h-8 text-[#6B7280]" /></div>
            <h2 className="text-lg font-medium text-white mb-2">Budget System Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">Budget tracking is not yet available. Department budgets and spending will appear once the service is deployed.</p>
            <button onClick={fetchBudgets} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">{loading ? 'Checking...' : 'Check Connection'}</button>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <PieChart className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No budgets configured</p>
            <p className="text-xs text-[#6B7280] mt-1">Department budgets will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => (
              <BudgetCard key={b.id} budget={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const usedPercent = Math.min((budget.spent / budget.allocated) * 100, 100);
  const statusColors = { active: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', frozen: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30', exceeded: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30' };
  const barColor = usedPercent > 90 ? 'bg-[#FF3B30]' : usedPercent > 75 ? 'bg-[#FFB020]' : 'bg-[#16C784]';

  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-white">{budget.name}</h3>
          <p className="text-[10px] text-[#6B7280]">{budget.category} • {budget.owner}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[budget.status]}`}>{budget.status}</span>
      </div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[#6B7280]">${budget.spent.toLocaleString()} <span className="text-[#6B7280]">/ ${budget.allocated.toLocaleString()}</span></span>
        <span className="text-white">{usedPercent.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${usedPercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">Remaining: ${budget.remaining.toLocaleString()}</p>
    </div>
  );
}
