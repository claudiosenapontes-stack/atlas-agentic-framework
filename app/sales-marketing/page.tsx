'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, DollarSign, AlertCircle, RefreshCw, Radio } from 'lucide-react';

interface SalesSnapshot {
  totalPipeline: number;
  dealsThisMonth: number;
  conversionRate: number;
  activeLeads: number;
}

export default function SalesMarketingPage() {
  const [snapshot, setSnapshot] = useState<SalesSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchSnapshot();
  }, []);

  async function fetchSnapshot() {
    setLoading(true);
    try {
      // Will connect to sales API when available
      setDataSource('unavailable');
    } catch (err) {
      console.error('[SalesMarketing] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6A00]/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sales & Marketing</h1>
              <p className="text-sm text-[#6B7280]">Pipeline and campaign management</p>
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
              <Target className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Sales & Marketing Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The sales and marketing backend is not yet available. Pipeline, campaigns, and lead tracking will appear once the service is deployed.
            </p>
            <button 
              onClick={fetchSnapshot} 
              disabled={loading} 
              className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors"
            >
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Pipeline Value" value="$0" color="green" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Deals This Month" value="0" color="blue" />
            <MetricCard icon={<Target className="w-4 h-4" />} label="Conversion Rate" value="0%" color="amber" />
            <MetricCard icon={<Users className="w-4 h-4" />} label="Active Leads" value="0" color="purple" />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'green' | 'blue' | 'amber' | 'purple' }) {
  const colors = { 
    green: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', 
    blue: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30', 
    amber: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30', 
    purple: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30' 
  };
  return (
    <div className={`p-4 rounded-[10px] border bg-[#111214] ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs opacity-80">{label}</span></div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
