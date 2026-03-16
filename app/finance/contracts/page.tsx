'use client';

import { useState, useEffect } from 'react';
import { Scale, AlertCircle, RefreshCw, Radio, Check, Download } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  counterparty: string;
  value: number;
  status: 'draft' | 'negotiating' | 'active' | 'expired' | 'terminated';
  startDate: string;
  endDate: string;
  legalPrivilege: boolean;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => { fetchContracts(); }, []);

  async function fetchContracts() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/contracts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Contracts] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Contracts</h1>
              <p className="text-sm text-[#6B7280]">Contract lifecycle management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
              <Check className="w-4 h-4 text-[#16C784]" />
              <span className="text-xs text-[#16C784]">{activeContracts} Active (${(totalValue/1000000).toFixed(1)}M)</span>
            </div>
            <button onClick={fetchContracts} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4"><Scale className="w-8 h-8 text-[#6B7280]" /></div>
            <h2 className="text-lg font-medium text-white mb-2">Contract System Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">Contract management is not yet available. Legal agreements will appear once the service is deployed.</p>
            <button onClick={fetchContracts} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">{loading ? 'Checking...' : 'Check Connection'}</button>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <Scale className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No contracts on file</p>
            <p className="text-xs text-[#6B7280] mt-1">Active contracts will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <ContractRow key={c.id} contract={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContractRow({ contract }: { contract: Contract }) {
  const statusColors = { draft: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30', negotiating: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30', active: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', expired: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30', terminated: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30' };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#111214] border border-[#1F2226] rounded-lg">
      <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[contract.status]}`}>{contract.status}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{contract.title}</p>
        <p className="text-[10px] text-[#6B7280]">{contract.counterparty}</p>
      </div>
      {contract.legalPrivilege && <span className="px-2 py-0.5 rounded text-[10px] bg-[#8B5CF6]/10 text-[#8B5CF6]">Privileged</span>}
      <span className="text-sm font-medium text-white">${contract.value.toLocaleString()}</span>
      <span className="text-[10px] text-[#6B7280]">{new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</span>
      <button className="p-1.5 text-[#6B7280] hover:text-white"><Download className="w-4 h-4" /></button>
    </div>
  );
}
