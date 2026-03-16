'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Zap, Radio, Activity, AlertCircle, CheckCircle2, Server, Cpu, Database, Globe, Layers, GitBranch, Play, Shield, AlertTriangle, Clock, Users, RefreshCw, ClipboardCheck, ShieldAlert, Pause, Power, RotateCw, Wrench } from 'lucide-react';
import Link from 'next/link';
import { UI_SAFE_MODE } from '../config/safe-mode';

interface Agent {
  id: string;
  name: string;
  display_name?: string;
  status: string;
  current_task?: string;
  responsiveness?: number;
  context_window?: number;
  last_heartbeat?: string;
  stalled?: boolean;
}

interface ButtonState {
  loading: boolean;
  success: boolean;
  error: boolean;
  disabled: boolean;
}

export default function ControlPage() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Button states for fleet commands
  const [fleetAuditState, setFleetAuditState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: false });
  const [pauseAllState, setPauseAllState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: true || UI_SAFE_MODE.DISABLED_FEATURES.pauseAll });
  const [resumeAllState, setResumeAllState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: true || UI_SAFE_MODE.DISABLED_FEATURES.resumeAll });
  const [boostRestartState, setBoostRestartState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: true || UI_SAFE_MODE.DISABLED_FEATURES.boostRestart });

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLiveData() {
    setAgentsLoading(true);
    try {
      const agentsRes = await fetch('/api/agents/live', { cache: 'no-store' });
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
        setDataSource('live');
        setLastUpdated(new Date());
        const hasAgents = (agentsData.agents || []).length > 0;
        setPauseAllState(prev => ({ ...prev, disabled: !hasAgents || UI_SAFE_MODE.DISABLED_FEATURES.pauseAll }));
        setResumeAllState(prev => ({ ...prev, disabled: !hasAgents || UI_SAFE_MODE.DISABLED_FEATURES.resumeAll }));
        setBoostRestartState(prev => ({ ...prev, disabled: !hasAgents || UI_SAFE_MODE.DISABLED_FEATURES.boostRestart }));
      } else {
        setAgents([]);
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[ControlPage] Error:', err);
      setDataSource('unavailable');
    } finally {
      setAgentsLoading(false);
    }
  }

  async function runFleetAudit() {
    setFleetAuditState({ loading: true, success: false, error: false, disabled: true });
    try {
      const res = await fetch('/api/audit/fleet', { method: 'POST' });
      if (res.ok) {
        setFleetAuditState({ loading: false, success: true, error: false, disabled: false });
        setTimeout(() => setFleetAuditState(prev => ({ ...prev, success: false })), 3000);
        fetchLiveData();
      } else {
        setFleetAuditState({ loading: false, success: false, error: true, disabled: false });
        setTimeout(() => setFleetAuditState(prev => ({ ...prev, error: false })), 3000);
      }
    } catch {
      setFleetAuditState({ loading: false, success: false, error: true, disabled: false });
      setTimeout(() => setFleetAuditState(prev => ({ ...prev, error: false })), 3000);
    }
  }

  async function pauseAllAgents() {
    if (UI_SAFE_MODE.DISABLED_FEATURES.pauseAll) {
      setPauseAllState({ loading: false, success: false, error: true, disabled: true });
      setTimeout(() => setPauseAllState(prev => ({ ...prev, error: false })), 3000);
      return;
    }
    setPauseAllState({ loading: true, success: false, error: false, disabled: true });
    try {
      const res = await fetch('/api/agents/pause-all', { method: 'POST' });
      if (res.ok) {
        setPauseAllState({ loading: false, success: true, error: false, disabled: false });
        setTimeout(() => setPauseAllState(prev => ({ ...prev, success: false })), 3000);
        fetchLiveData();
      } else {
        setPauseAllState({ loading: false, success: false, error: true, disabled: false });
        setTimeout(() => setPauseAllState(prev => ({ ...prev, error: false })), 3000);
      }
    } catch {
      setPauseAllState({ loading: false, success: false, error: true, disabled: false });
      setTimeout(() => setPauseAllState(prev => ({ ...prev, error: false })), 3000);
    }
  }

  async function resumeAllAgents() {
    if (UI_SAFE_MODE.DISABLED_FEATURES.resumeAll) {
      setResumeAllState({ loading: false, success: false, error: true, disabled: true });
      setTimeout(() => setResumeAllState(prev => ({ ...prev, error: false })), 3000);
      return;
    }
    setResumeAllState({ loading: true, success: false, error: false, disabled: true });
    try {
      const res = await fetch('/api/agents/resume-all', { method: 'POST' });
      if (res.ok) {
        setResumeAllState({ loading: false, success: true, error: false, disabled: false });
        setTimeout(() => setResumeAllState(prev => ({ ...prev, success: false })), 3000);
        fetchLiveData();
      } else {
        setResumeAllState({ loading: false, success: false, error: true, disabled: false });
        setTimeout(() => setResumeAllState(prev => ({ ...prev, error: false })), 3000);
      }
    } catch {
      setResumeAllState({ loading: false, success: false, error: true, disabled: false });
      setTimeout(() => setResumeAllState(prev => ({ ...prev, error: false })), 3000);
    }
  }

  async function boostRestartAllStuck() {
    if (UI_SAFE_MODE.DISABLED_FEATURES.boostRestart) {
      setBoostRestartState({ loading: false, success: false, error: true, disabled: true });
      setTimeout(() => setBoostRestartState(prev => ({ ...prev, error: false })), 3000);
      return;
    }
    setBoostRestartState({ loading: true, success: false, error: false, disabled: true });
    try {
      // ATLAS-PRIME-BOOST-RESTART-UI-TRUTH-FIX-001: Fixed endpoint
      // Was: /api/agents/boost-restart-stuck (404 - does not exist)
      // Now: /api/fleet/commands with action payload
      const res = await fetch('/api/fleet/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'boost-restart-stuck', initiated_by: 'operator' })
      });
      if (res.ok) {
        setBoostRestartState({ loading: false, success: true, error: false, disabled: false });
        setTimeout(() => setBoostRestartState(prev => ({ ...prev, success: false })), 3000);
        fetchLiveData();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ControlPage] Boost restart failed:', errorData);
        setBoostRestartState({ loading: false, success: false, error: true, disabled: false });
        setTimeout(() => setBoostRestartState(prev => ({ ...prev, error: false })), 3000);
      }
    } catch (error) {
      console.error('[ControlPage] Boost restart error:', error);
      setBoostRestartState({ loading: false, success: false, error: true, disabled: false });
      setTimeout(() => setBoostRestartState(prev => ({ ...prev, error: false })), 3000);
    }
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const diff = Date.now() - lastUpdated.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const isDataStale = lastUpdated ? (Date.now() - lastUpdated.getTime()) > 600000 : true;
  const onlineCount = agents.filter(a => a.status === 'online').length;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Atlas OS Control</h1>
              <p className="text-[10px] text-[#6B7280]">System Integrity Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">SYSTEM OPERATIONAL</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NO LIVE DATA</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Safe Mode Banner */}
      {UI_SAFE_MODE.ACTIVE && (
        <div className="bg-[#FFB020]/10 border-y border-[#FFB020]/30 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <Wrench className="w-4 h-4 text-[#FFB020]" />
            <span className="text-sm font-medium text-[#FFB020]">{UI_SAFE_MODE.BANNER_TEXT}</span>
          </div>
        </div>
      )}

      <main className="p-4">
        {/* Data Status Bar */}
        <div className="flex items-center justify-between mb-4 p-2 bg-[#111214] rounded-lg border border-[#1F2226]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
            <span className="text-xs text-[#9BA3AF]">{dataSource === 'live' ? 'Live data' : 'No live data connection'}</span>
            {lastUpdated && <span className={`text-xs ${isDataStale ? 'text-[#FFB020]' : 'text-[#6B7280]'}`}>• Last updated: {formatLastUpdated()}</span>}
          </div>
          <button onClick={fetchLiveData} className="flex items-center gap-1 px-2 py-1 text-xs text-[#9BA3AF] hover:text-white transition-colors">
            <RefreshCw className={`w-3 h-3 ${agentsLoading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Fleet Command Bar */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Power className="w-4 h-4" />Fleet Commands
          </h2>
          {/* TRUTH BADGE */}
          <div className="mb-3 p-2 bg-[#3B82F6]/5 rounded border border-[#3B82F6]/20 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-[#3B82F6]" />
            <span className="text-[10px] text-[#3B82F6]">
              Boost restart resets execution status only. No per-agent protocol implemented.
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <FleetCommandButton label="Run Fleet Audit" icon={<ClipboardCheck className="w-4 h-4" />} state={fleetAuditState} onClick={runFleetAudit} variant="primary" />
            <FleetCommandButton label="Pause All Agents" icon={<Pause className="w-4 h-4" />} state={pauseAllState} onClick={pauseAllAgents} variant="warning" />
            <FleetCommandButton label="Resume All Agents" icon={<Play className="w-4 h-4" />} state={resumeAllState} onClick={resumeAllAgents} variant="success" />
            <FleetCommandButton label="Boost Restart All Stuck" icon={<RotateCw className="w-4 h-4" />} state={boostRestartState} onClick={boostRestartAllStuck} variant="danger" />
          </div>
        </section>

        {/* System Summary */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" />System Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Fleet Online" value={dataSource === 'live' ? `${onlineCount}/${agents.length}` : 'No data'} color={dataSource === 'live' ? 'green' : 'neutral'} />
            <StatCard label="Active Agents" value={dataSource === 'live' ? onlineCount : '--'} color={dataSource === 'live' ? 'green' : 'neutral'} />
            <StatCard label="Stalled Agents" value={dataSource === 'live' ? agents.filter(a => a.stalled).length : '--'} color={agents.filter(a => a.stalled).length > 0 ? 'amber' : 'green'} />
            <StatCard label="Data Status" value={dataSource === 'live' ? 'LIVE' : 'UNAVAILABLE'} color={dataSource === 'live' ? 'green' : 'neutral'} />
          </div>
        </section>

        {/* Agent Runtime Overview */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />Agent Runtime Overview
          </h2>
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
            {agentsLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-[#6B7280] animate-spin" />
                <p className="text-sm text-[#6B7280]">Loading agent data...</p>
              </div>
            ) : dataSource === 'unavailable' || agents.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#6B7280]" />
                <p className="text-sm text-[#9BA3AF]">No live agent data available</p>
                <p className="text-xs text-[#6B7280] mt-1">Agent telemetry not yet instrumented</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#0B0B0C]">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Agent</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Current Task</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Resp</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Context</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase">Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2226]">
                  {agents.map((agent) => (
                    <tr key={agent.id} className={agent.stalled ? 'bg-red-500/5' : ''}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-400' : agent.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                          <span className="text-sm text-white">{agent.display_name || agent.name
}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs ${agent.status === 'online' ? 'text-green-400' : agent.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>{agent.status}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-[#9BA3AF]">{agent.current_task || 'No active task'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-[#1F2226] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${agent.responsiveness || 0}%` }} />
                          </div>
                          <span className="text-xs text-[#6B7280]">{agent.responsiveness || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs ${(agent.context_window || 0) > 80 ? 'text-red-400' : (agent.context_window || 0) > 60 ? 'text-amber-400' : 'text-green-400'}`}>{agent.context_window || 0}%</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-[#6B7280]">{agent.last_heartbeat || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* System Health - Truthful Empty State */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />System Health
          </h2>
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-8 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#6B7280]" />
            <p className="text-sm text-[#9BA3AF]">Health telemetry not yet instrumented</p>
            <p className="text-xs text-[#6B7280] mt-1">Awaiting integration with monitoring backend</p>
          </div>
        </section>

        {/* Audit Center */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Play className="w-4 h-4" />Audit Center
          </h2>
          <div className="flex flex-wrap gap-3">
            <AuditButton label="Fleet Audit" onClick={() => console.log('Fleet audit')} />
            <AuditButton label="Systems Audit" onClick={() => console.log('Systems audit')} />
            <AuditButton label="Connections Audit" onClick={() => console.log('Connections audit')} />
            <AuditButton label="Services Audit" onClick={() => console.log('Services audit')} />
            <AuditButton label="Database Audit" onClick={() => console.log('Database audit')} />
          </div>
        </section>

        {/* Incident Center */}
        <section className="mt-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />Incident Center
          </h2>
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-8 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-[#16C784]" />
            <p className="text-sm text-[#9BA3AF]">No active incidents</p>
            <p className="text-xs text-[#6B7280] mt-1">Incident tracking awaiting integration</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    neutral: 'bg-[#6B7280]/10 border-[#6B7280]/30 text-[#6B7280]'
  };
  return (
    <div className={`px-3 py-2 rounded-lg border ${colors[color]}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
    </div>
  );
}

function AuditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-[#111214] border border-[#1F2226] rounded-lg hover:bg-[#1F2226] hover:border-[#2a2d31] transition-colors">
      <Play className="w-4 h-4 text-[#9BA3AF]" />
      <span className="text-sm text-white">{label}</span>
    </button>
  );
}

function FleetCommandButton({ label, icon, variant, onClick, state }: { label: string; icon: React.ReactNode; variant: 'primary' | 'warning' | 'success' | 'danger'; onClick: () => void; state: ButtonState }) {
  const variants = {
    primary: state.success ? 'bg-[#16C784]/20 border-[#16C784]/50 text-[#16C784]' : state.error ? 'bg-[#FF3B30]/20 border-[#FF3B30]/50 text-[#FF3B30]' : state.loading ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]' : state.disabled ? 'bg-[#1F2226] border-[#1F2226] text-[#6B7280] cursor-not-allowed' : 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/20',
    warning: state.success ? 'bg-[#16C784]/20 border-[#16C784]/50 text-[#16C784]' : state.error ? 'bg-[#FF3B30]/20 border-[#FF3B30]/50 text-[#FF3B30]' : state.loading ? 'bg-[#FFB020]/20 border-[#FFB020]/50 text-[#FFB020]' : state.disabled ? 'bg-[#1F2226] border-[#1F2226] text-[#6B7280] cursor-not-allowed' : 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020] hover:bg-[#FFB020]/20',
    success: state.success ? 'bg-[#16C784]/20 border-[#16C784]/50 text-[#16C784]' : state.error ? 'bg-[#FF3B30]/20 border-[#FF3B30]/50 text-[#FF3B30]' : state.loading ? 'bg-[#16C784]/20 border-[#16C784]/50 text-[#16C784]' : state.disabled ? 'bg-[#1F2226] border-[#1F2226] text-[#6B7280] cursor-not-allowed' : 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784] hover:bg-[#16C784]/20',
    danger: state.success ? 'bg-[#16C784]/20 border-[#16C784]/50 text-[#16C784]' : state.error ? 'bg-[#FF3B30]/20 border-[#FF3B30]/50 text-[#FF3B30]' : state.loading ? 'bg-[#FF3B30]/20 border-[#FF3B30]/50 text-[#FF3B30]' : state.disabled ? 'bg-[#1F2226] border-[#1F2226] text-[#6B7280] cursor-not-allowed' : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/20',
  };

  return (
    <button onClick={onClick} disabled={state.loading || state.disabled} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${variants[variant]}`}>
      {state.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : state.success ? <CheckCircle2 className="w-4 h-4" /> : state.error ? <AlertCircle className="w-4 h-4" /> : icon}
      <span className="text-sm font-medium">{state.success ? 'Done' : state.error ? 'Failed' : state.loading ? 'Running...' : label}</span>
    </button>
  );
}
