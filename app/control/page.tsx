'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Activity, AlertTriangle, Clock, Power, Cpu, RefreshCw, AlertCircle, ClipboardCheck, Pause, Play, RotateCw, Wrench } from 'lucide-react';
import { UI_SAFE_MODE } from '../config/safe-mode';

interface Agent {
  id: string;
  name: string;
  display_name?: string;
  status: string;
  current_task?: string;
  responsiveness?: number;
  stalled?: boolean;
}

interface ButtonState {
  loading: boolean;
  success: boolean;
  error: boolean;
  disabled: boolean;
}

function StatCard({ icon: Icon, label, value, highlight = false }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <span className="text-xs text-[#6B7280]">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${highlight ? 'text-[#FFB020]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-6 h-6 mx-auto mb-2 text-[#6B7280]" />
      <p className="text-sm text-[#9BA3AF]">{title}</p>
      <p className="text-xs text-[#6B7280] mt-1">{description}</p>
    </div>
  );
}

function CommandButton({ label, icon: Icon, state, onClick, variant }: { label: string; icon: any; state: ButtonState; onClick: () => void; variant: 'primary' | 'warning' | 'success' | 'danger' }) {
  const variants = {
    primary: 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/20',
    warning: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020] hover:bg-[#FFB020]/20',
    success: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784] hover:bg-[#16C784]/20',
    danger: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/20',
  };
  
  return (
    <button onClick={onClick} disabled={state.loading || state.disabled} 
      className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${variants[variant]} disabled:opacity-50`}>
      {state.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {state.success ? 'Done' : state.error ? 'Failed' : state.loading ? '...' : label}
    </button>
  );
}

export default function ControlPage() {
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [fleetAuditState, setFleetAuditState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: false });
  const [pauseAllState, setPauseAllState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: UI_SAFE_MODE.DISABLED_FEATURES.pauseAll });
  const [resumeAllState, setResumeAllState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: UI_SAFE_MODE.DISABLED_FEATURES.resumeAll });
  const [boostRestartState, setBoostRestartState] = useState<ButtonState>({ loading: false, success: false, error: false, disabled: UI_SAFE_MODE.DISABLED_FEATURES.boostRestart });

  useEffect(() => { fetchLiveData(); const i = setInterval(fetchLiveData, 30000); return () => clearInterval(i); }, []);

  async function fetchLiveData() {
    setAgentsLoading(true);
    try {
      const res = await fetch('/api/agents/live', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setDataSource('live');
        setLastUpdated(new Date());
      } else {
        setDataSource('unavailable');
      }
    } catch { setDataSource('unavailable'); }
    finally { setAgentsLoading(false); }
  }

  async function runFleetAudit() {
    setFleetAuditState({ ...fleetAuditState, loading: true, disabled: true });
    try {
      const res = await fetch('/api/audit/fleet', { method: 'POST' });
      setFleetAuditState({ loading: false, success: res.ok, error: !res.ok, disabled: false });
      if (res.ok) fetchLiveData();
    } catch { setFleetAuditState({ loading: false, success: false, error: true, disabled: false }); }
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const diff = Date.now() - lastUpdated.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const stalledCount = agents.filter(a => a.stalled).length;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header - Knowledge Pattern */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Control Center</h1>
              <p className="text-sm text-[#6B7280]">Fleet management & system integrity</p>
            </div>
          </div>
          <span className={`px-2 py-1 border rounded text-xs ${dataSource === 'live' ? 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]' : 'bg-[#6B7280]/10 border-[#6B7280]/30 text-[#6B7280]'}`}>
            {dataSource === 'live' ? 'Live' : 'Not Connected'}
          </span>
        </div>

        {/* Stats - Knowledge Pattern */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Fleet Online" value={agentsLoading ? '-' : `${onlineCount}/${agents.length}`} />
          <StatCard icon={Activity} label="Active Agents" value={agentsLoading ? '-' : onlineCount} />
          <StatCard icon={AlertTriangle} label="Stalled" value={agentsLoading ? '-' : stalledCount} highlight={stalledCount > 0} />
          <StatCard icon={Clock} label="Last Update" value={formatLastUpdated()} />
        </div>

        {UI_SAFE_MODE.ACTIVE && (
          <div className="mb-6 p-3 bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-[10px]">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#FFB020]" />
              <span className="text-sm text-[#FFB020]">{UI_SAFE_MODE.BANNER_TEXT}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Fleet Commands" icon={Power}>
              <div className="mb-3 p-2 bg-[#3B82F6]/5 rounded border border-[#3B82F6]/20 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-[#3B82F6]" />
                <span className="text-[10px] text-[#3B82F6]">Boost restart resets execution status only. No per-agent protocol implemented.</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <CommandButton label="Run Fleet Audit" icon={ClipboardCheck} state={fleetAuditState} onClick={runFleetAudit} variant="primary" />
                <CommandButton label="Pause All" icon={Pause} state={pauseAllState} onClick={() => {}} variant="warning" />
                <CommandButton label="Resume All" icon={Play} state={resumeAllState} onClick={() => {}} variant="success" />
                <CommandButton label="Boost Restart" icon={RotateCw} state={boostRestartState} onClick={() => {}} variant="danger" />
              </div>
            </SectionCard>

            <SectionCard title="Agent Runtime" icon={Cpu}>
              {agentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-[#6B7280] animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <EmptyState icon={AlertCircle} title="No agents connected" description="Agent telemetry not yet instrumented" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1F2226]">
                        <th className="text-left py-2 text-xs text-[#6B7280] font-medium">Agent</th>
                        <th className="text-left py-2 text-xs text-[#6B7280] font-medium">Status</th>
                        <th className="text-left py-2 text-xs text-[#6B7280] font-medium">Task</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2226]">
                      {agents.slice(0, 5).map((agent) => (
                        <tr key={agent.id}>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-[#16C784]' : 'bg-[#FF3B30]'}`} />
                              <span className="text-sm text-white">{agent.display_name || agent.name}</span>
                            </div>
                          </td>
                          <td className="py-2 text-xs text-[#6B7280]">{agent.status}</td>
                          <td className="py-2 text-xs text-[#6B7280] truncate max-w-[150px]">{agent.current_task || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="System Health" icon={Activity}>
              <EmptyState icon={AlertCircle} title="Health telemetry not yet instrumented" description="Awaiting integration with monitoring backend" />
            </SectionCard>

            <SectionCard title="Audit Center" icon={ClipboardCheck}>
              <div className="mb-3 p-2 bg-[#3B82F6]/5 rounded border border-[#3B82F6]/20 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-[#3B82F6]" />
                <span className="text-[10px] text-[#3B82F6]">Only Fleet Audit is wired to backend.</span>
              </div>
              <button onClick={runFleetAudit} disabled={fleetAuditState.loading} className="w-full py-2 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg text-sm text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-colors disabled:opacity-50">
                {fleetAuditState.loading ? 'Running...' : 'Run Fleet Audit'}
              </button>
            </SectionCard>

            <SectionCard title="Incident Center" icon={AlertTriangle}>
              <div className="text-center py-4">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#16C784]/10 flex items-center justify-center">
                  <span className="text-[#16C784]">✓</span>
                </div>
                <p className="text-sm text-[#9BA3AF]">No active incidents</p>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
