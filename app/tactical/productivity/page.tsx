'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, LayoutDashboard, CheckSquare, Users, TrendingUp, Flag, Building2, AlertCircle, RefreshCw, Radio, Clock, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface ProductivityMetrics {
  tasksCompleted: number;
  tasksCreated: number;
  avgCompletionTime: number | null;
  onTimeRate: number | null;
  agentVelocity: { agent: string; tasksCompleted: number; avgTime: number }[];
}

export default function TacticalProductivityPage() {
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical/productivity', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[TacticalProductivity] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: '/tactical', label: 'Overview', icon: LayoutDashboard },
    { href: '/tactical/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/tactical/delegation', label: 'Delegation', icon: Users },
    { href: '/tactical/productivity', label: 'Productivity', icon: TrendingUp },
    { href: '/tactical/milestones', label: 'Milestones', icon: Flag },
    { href: '/tactical/companies', label: 'Companies', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Tactical Ops</h1>
              <p className="text-[10px] text-[#6B7280]">Real-time Execution Center</p>
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
            const isActive = item.href === '/tactical/productivity';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isActive ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#16C784]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#16C784]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Productivity Metrics</h1>
              <p className="text-sm text-[#6B7280]">Agent velocity and completion analytics</p>
            </div>
          </div>
          <button onClick={fetchMetrics} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Productivity Analytics Not Available</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The productivity metrics API is not yet connected. Agent velocity and completion analytics will appear once the service is deployed.
            </p>
            <button onClick={fetchMetrics} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <MetricCard icon={<CheckSquare className="w-4 h-4" />} label="Completed" value={metrics.tasksCompleted} color="green" />
              <MetricCard icon={<Clock className="w-4 h-4" />} label="Created" value={metrics.tasksCreated} color="blue" />
              <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="On-Time Rate" value={metrics.onTimeRate !== null ? `${metrics.onTimeRate}%` : '--'} color="purple" />
              <MetricCard icon={<Clock className="w-4 h-4" />} label="Avg Time" value={metrics.avgCompletionTime !== null ? `${metrics.avgCompletionTime}h` : '--'} color="amber" />
            </div>

            {metrics.agentVelocity.length > 0 && (
              <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                <h3 className="text-sm font-medium text-white mb-4">Agent Velocity</h3>
                <div className="space-y-2">
                  {metrics.agentVelocity.map((agent) => (
                    <div key={agent.agent} className="flex items-center gap-3 p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                      <span className="text-sm text-white w-24">{agent.agent}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#1F2226] rounded-full overflow-hidden">
                          <div className="h-full bg-[#16C784] rounded-full" style={{ width: `${Math.min(agent.tasksCompleted * 5, 100)}%` }} />
                        </div>
                        <span className="text-xs text-[#6B7280]">{agent.tasksCompleted} tasks</span>
                      </div>
                      <span className="text-xs text-[#6B7280]">{agent.avgTime}h avg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: 'green' | 'blue' | 'purple' | 'amber' }) {
  const colorMap = {
    green: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
    blue: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    purple: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
    amber: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
  };

  return (
    <div className={`p-4 rounded-[10px] border bg-[#111214] ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs opacity-80">{label}</span></div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
