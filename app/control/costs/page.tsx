'use client';

import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, Activity, Zap, Radio, RefreshCw, Users, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface CostSummary {
  period: string;
  total_cost_usd: number;
  total_tokens: number;
  total_executions: number;
  avg_cost_per_execution: number;
  avg_tokens_per_execution: number;
}

interface CostByAgent {
  agent_id: string;
  agent_name: string;
  execution_count: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface TokenUsageByAgent {
  agent_id: string;
  agent_name: string;
  total_tokens: number;
  avg_tokens_per_execution: number;
}

export default function CostsPage() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [costByAgent, setCostByAgent] = useState<CostByAgent[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageByAgent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostData();
  }, []);

  async function fetchCostData() {
    setLoading(true);
    try {
      const res = await fetch('/api/costs/summary', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
          setCostByAgent(data.cost_by_agent || []);
          setTokenUsage(data.token_usage_by_agent || []);
          setDataSource('live');
          setLastUpdated(new Date());
        } else {
          setDataSource('unavailable');
        }
      } else {
        setDataSource('unavailable');
      }
    } catch {
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number) => {
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.01) return `$${val.toFixed(3)}`;
    return `$${val.toFixed(4)}`;
  };

  const formatNumber = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const diff = Date.now() - lastUpdated.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Atlas OS Control</h1>
              <p className="text-[10px] text-[#6B7280]">System Integrity Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">LIVE DATA</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NOT INSTRUMENTED</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {['Atlas Control','Fleet','Costs','Integrations','Audit','Incident Center'].map((label, i) => {
            const paths = ['/control','/control/fleet','/control/costs','/control/integrations','/control/audit','/control/incidents'];
            return <Link key={label} href={paths[i]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${label === 'Costs' ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>{label}</Link>;
          })}
        </nav>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Cost Observatory</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Token usage and spend analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchCostData} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' || !summary ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Cost Telemetry Not Yet Instrumented</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The cost observability backend is not yet connected. Real-time spend tracking, 
              token usage analytics, and waste analysis will be available once the telemetry 
              pipeline is fully integrated.
            </p>
            <button onClick={fetchCostData} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
              {loading ? 'Checking...' : 'Check Again'}
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[#16C784]" />
                  <span className="text-xs text-[#6B7280] uppercase">Total Cost (30d)</span>
                </div>
                <p className="text-2xl font-mono text-white">{formatCurrency(summary.total_cost_usd)}</p>
                <p className="text-[10px] text-[#6B7280] mt-1">{summary.period} period</p>
              </div>
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#6B7280] uppercase">Total Tokens</span>
                </div>
                <p className="text-2xl font-mono text-white">{formatNumber(summary.total_tokens)}</p>
                <p className="text-[10px] text-[#6B7280] mt-1">Across all agents</p>
              </div>
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-[#FFB020]" />
                  <span className="text-xs text-[#6B7280] uppercase">Executions</span>
                </div>
                <p className="text-2xl font-mono text-white">{formatNumber(summary.total_executions)}</p>
                <p className="text-[10px] text-[#6B7280] mt-1">Total runs</p>
              </div>
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#9BA3AF]" />
                  <span className="text-xs text-[#6B7280] uppercase">Avg Cost/Exec</span>
                </div>
                <p className="text-2xl font-mono text-white">{formatCurrency(summary.avg_cost_per_execution)}</p>
                <p className="text-[10px] text-[#6B7280] mt-1">~{formatNumber(summary.avg_tokens_per_execution)} tokens</p>
              </div>
            </div>

            {/* Cost by Agent */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1F2226]">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#9BA3AF]" />
                  Cost by Agent
                </h3>
              </div>
              <div className="divide-y divide-[#1F2226]">
                {costByAgent.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No cost data by agent available</div>
                ) : (
                  costByAgent.map((agent) => (
                    <div key={agent.agent_id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0B0B0C] border border-[#1F2226] flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#6B7280]" />
                        </div>
                        <div>
                          <p className="text-sm text-white">{agent.agent_name || 'Unknown'}</p>
                          <p className="text-[10px] text-[#6B7280]">{agent.execution_count.toLocaleString()} executions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-white">{formatCurrency(agent.total_cost_usd)}</p>
                        <p className="text-[10px] text-[#6B7280]">{formatNumber(agent.total_tokens)} tokens</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Token Usage */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1F2226]">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#9BA3AF]" />
                  Token Usage by Agent
                </h3>
              </div>
              <div className="divide-y divide-[#1F2226]">
                {tokenUsage.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No token usage data available</div>
                ) : (
                  tokenUsage.map((agent) => (
                    <div key={agent.agent_id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">{agent.agent_name || 'Unknown'}</span>
                        <span className="text-sm font-mono text-[#9BA3AF]">{formatNumber(agent.total_tokens)} tokens</span>
                      </div>
                      <div className="h-2 bg-[#0B0B0C] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3B82F6] rounded-full" 
                          style={{ width: `${Math.min(100, (agent.total_tokens / (summary?.total_tokens || 1)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#6B7280] mt-1">~{formatNumber(agent.avg_tokens_per_execution)} tokens/execution</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#111214] rounded-lg border border-[#1F2226]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16C784]" />
                <span className="text-xs text-[#9BA3AF]">Live cost telemetry</span>
                <span className="text-xs text-[#6B7280]">• Last updated: {formatLastUpdated()}</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
