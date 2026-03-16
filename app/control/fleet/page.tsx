'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, Cpu, Zap, AlertCircle, Users, RotateCw, Check, RefreshCw, Radio } from "lucide-react";
import Link from "next/link";

interface AgentData {
  id: string;
  name: string;
  display_name: string;
  role: string;
  status: 'online' | 'offline' | 'degraded';
  currentTask: string | null;
  lastExecution: string;
  sessionAge: string;
  lastRestart: string;
  efficiency: 'healthy' | 'warning' | 'degraded' | 'restart_recommended';
  responsiveness: number | null;
  contextWindow: number | null;
  lastHeartbeat: string;
  lastSeen: string;
  loadPercent: number;
  stalled?: boolean;
}

interface SessionData {
  id: string;
  agent_id: string;
  session_age_formatted: string;
  context_utilization_pct: number;
  idle_time_minutes: number;
  status: string;
  model: string;
}

type RestartState = 'idle' | 'snapshot_saved' | 'restarting' | 'context_restored' | 'resumed' | 'failed';

const efficiencyColors: Record<string, string> = {
  healthy: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  warning: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
  degraded: 'bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/30',
  restart_recommended: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

export default function FleetPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [sessions, setSessions] = useState<Map<string, SessionData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [restartStates, setRestartStates] = useState<Record<string, RestartState>>({});
  const [restartProgress, setRestartProgress] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFleetData();
    const interval = setInterval(fetchFleetData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchFleetData() {
    setLoading(true);
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch('/api/agents/live', { cache: 'no-store' }),
        fetch('/api/agents/sessions', { cache: 'no-store' }).catch(() => null)
      ]);

      let sessionsMap = new Map<string, SessionData>();
      
      if (sessionsRes && sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        if (sessionsData.sessions) {
          sessionsData.sessions.forEach((s: SessionData) => {
            sessionsMap.set(s.agent_id, s);
          });
        }
        setSessions(sessionsMap);
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        
        const transformedAgents: AgentData[] = (data.agents || []).map((a: any) => {
          const session = sessionsMap.get(a.name);
          
          let responsiveness: number | null = null;
          if (session) {
            const idleMin = session.idle_time_minutes || 0;
            if (idleMin < 5) responsiveness = 100;
            else if (idleMin < 30) responsiveness = 80;
            else if (idleMin < 120) responsiveness = 50;
            else responsiveness = 20;
          }

          let efficiency: 'healthy' | 'warning' | 'degraded' | 'restart_recommended' = 'healthy';
          if (session) {
            const ctxPct = session.context_utilization_pct || 0;
            const idleMin = session.idle_time_minutes || 0;
            if (ctxPct > 90 || idleMin > 120) efficiency = 'restart_recommended';
            else if (ctxPct > 70 || idleMin > 60) efficiency = 'degraded';
            else if (ctxPct > 50 || idleMin > 30) efficiency = 'warning';
          }

          return {
            id: a.name || a.id || String(Math.random()),
            name: a.name || 'unknown',
            display_name: a.displayName || a.display_name || a.name || 'Unknown',
            role: a.agentType || a.role || 'Agent',
            status: a.status || 'offline',
            currentTask: a.currentTask || a.current_task || null,
            lastExecution: a.lastExecution || a.last_execution || 'None',
            sessionAge: session?.session_age_formatted || a.sessionAge || 'Unknown',
            lastRestart: a.lastRestart || a.last_restart || 'Unknown',
            efficiency,
            responsiveness,
            contextWindow: session?.context_utilization_pct ?? a.contextWindow ?? null,
            lastHeartbeat: session 
              ? `${Math.round((session.idle_time_minutes || 0))}m ago`
              : a.lastHeartbeat || a.last_seen || a.lastSeen || 'Unknown',
            lastSeen: a.lastSeen || a.last_seen || new Date().toISOString(),
            loadPercent: a.cpu || a.loadPercent || 0,
            stalled: (session?.idle_time_minutes || 0) > 120 || responsiveness === 20,
          };
        });
        
        setAgents(transformedAgents);
        setDataSource('live');
        setLastUpdated(new Date());
      } else {
        setAgents([]);
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[FleetPage] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const handleBoostRestart = async (agentId: string) => {
    // ATLAS-PRIME-BOOST-RESTART-UI-TRUTH-FIX-001: Not wired to backend
    // Backend service exists at services/severino-realm/boost-restart.js
    // but endpoint /api/agents/{id}/boost-restart does not exist
    console.log(`[FleetPage] Boost restart not wired for agent: ${agentId}`);
  };

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const avgLoad = agents.length > 0 ? Math.round(agents.reduce((acc, a) => acc + a.loadPercent, 0) / agents.length) : 0;

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
                <span className="text-xs text-[#6B7280]">NO LIVE DATA</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {['Atlas Control','Fleet','Costs','Integrations','Audit','Incident Center'].map((label, i) => {
            const paths = ['/control','/control/fleet','/control/costs','/control/integrations','/control/audit','/control/incidents'];
            return <Link key={label} href={paths[i]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${label === 'Fleet' ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>{label}</Link>;
          })}
        </nav>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex items-center justify-between p-2 bg-[#111214] rounded-lg border border-[#1F2226]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
            <span className="text-xs text-[#9BA3AF]">{dataSource === 'live' ? `Live telemetry • ${sessions.size} sessions tracked` : 'No live data connection'}</span>
            {lastUpdated && <span className="text-xs text-[#6B7280]">• Last updated: {formatLastUpdated()}</span>}
          </div>
          <button onClick={fetchFleetData} disabled={loading} className="flex items-center gap-1 px-2 py-1 text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Agent Fleet</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Monitor and manage AI agents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
              <div className="w-1.5 h-1.5 bg-[#16C784] rounded-full animate-pulse" />
              <span className="text-xs text-[#16C784] font-medium">{onlineCount} Online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg">
              <Cpu className="w-4 h-4 text-[#9BA3AF]" />
              <span className="text-xs text-[#9BA3AF] font-medium">{avgLoad}% Load</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FleetStatCard icon={<Users className="w-4 h-4 text-[#9BA3AF]" />} label="Total Agents" value={agents.length} />
          <FleetStatCard icon={<CheckCircle className="w-4 h-4 text-[#16C784]" />} label="Active" value={onlineCount} suffix={agents.length > 0 ? `${Math.round((onlineCount / agents.length) * 100)}%` : undefined} />
          <FleetStatCard icon={<Activity className="w-4 h-4 text-[#FFB020]" />} label="Avg Load" value={`${avgLoad}%`} status={avgLoad > 80 ? 'critical' : avgLoad > 50 ? 'warning' : 'normal'} />
          <FleetStatCard icon={<Clock className="w-4 h-4 text-[#9BA3AF]" />} label="Sessions" value={sessions.size > 0 ? sessions.size : 'OFFLINE'} status={sessions.size > 0 ? 'normal' : 'neutral'} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[#6B7280] animate-spin mb-4" />
            <p className="text-sm text-[#9BA3AF]">Loading agent data...</p>
          </div>
        ) : dataSource === 'unavailable' || agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <AlertCircle className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No live agent data available</p>
            <p className="text-xs text-[#6B7280] mt-1">Agent telemetry not yet instrumented</p>
            <button onClick={fetchFleetData} className="mt-4 px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">Retry Connection</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {agents.map(agent => (
              <FleetAgentCard
                key={agent.id}
                agent={agent}
                restartState={restartStates[agent.id] || 'idle'}
                restartProgress={restartProgress[agent.id] || ''}
                onBoostRestart={() => handleBoostRestart(agent.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FleetStatCard({ icon, label, value, suffix, status = 'neutral' }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string; status?: 'normal' | 'warning' | 'critical' | 'neutral'; }) {
  const statusColors = { normal: 'text-[#16C784]', warning: 'text-[#FFB020]', critical: 'text-[#FF3B30]', neutral: 'text-[#6B7280]' };
  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[#6B7280]
 text-xs">{label}</span></div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-semibold text-white">{value}</span>
        {suffix && <span className={`text-xs ${statusColors[status]}`}>{suffix}</span>}
      </div>
    </div>
  );
}

function FleetAgentCard({ agent, restartState, restartProgress, onBoostRestart }: { agent: AgentData; restartState: RestartState; restartProgress: string; onBoostRestart: () => void; }) {
  const isOnline = agent.status === 'online';
  const hasResponsiveness = agent.responsiveness !== null && agent.responsiveness !== undefined;
  const hasContext = agent.contextWindow !== null && agent.contextWindow !== undefined;
  const isStalled = agent.stalled || (hasResponsiveness && agent.responsiveness! < 50);
  const contextPercent = agent.contextWindow ?? 0;
  const responsiveness = agent.responsiveness ?? 0;
  const heartbeat = agent.lastHeartbeat;
  const isRestarting = restartState === 'snapshot_saved' || restartState === 'restarting' || restartState === 'context_restored';

  return (
    <div className={`bg-[#111214] border rounded-[10px] p-4 hover:border-[#6B7280]/30 transition-colors ${isStalled ? 'border-[#FF3B30]/50' : 'border-[#1F2226]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isOnline ? "bg-[#16C784]/10" : "bg-[#1F2226]"} ${isStalled ? 'animate-pulse' : ''}`}>
            {isStalled ? <AlertCircle className="w-4 h-4 text-[#FF3B30]" /> : isOnline ? <Zap className="w-4 h-4 text-[#16C784]" /> : <AlertCircle className="w-4 h-4 text-[#6B7280]" />}
          </div>
          <div>
            <h3 className="font-medium text-sm text-white">{agent.display_name}</h3>
            <p className="text-[10px] text-[#6B7280] capitalize">{agent.role}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-[#16C784] animate-pulse" : "bg-[#6B7280]"}`} />
            <span className={`text-[10px] ${isOnline ? "text-[#16C784]" : "text-[#6B7280]"}`}>{isOnline ? "Online" : "Offline"}</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${efficiencyColors[agent.efficiency]}`}>{agent.efficiency.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Current Task</p>
        <p className={`text-xs ${agent.currentTask ? "text-[#9BA3AF]" : "text-[#6B7280] italic"}`}>{agent.currentTask || "No active task"}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]"><span className="text-[#6B7280]">Last Execution</span><p className="text-[#9BA3AF] mt-0.5">{agent.lastExecution}</p></div>
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]"><span className="text-[#6B7280]">Session Age</span><p className="text-[#9BA3AF] mt-0.5">{agent.sessionAge}</p></div>
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]"><span className="text-[#6B7280]">Last Restart</span><p className="text-[#9BA3AF] mt-0.5">{agent.lastRestart}</p></div>
        <div className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]"><span className="text-[#6B7280]">Heartbeat</span><p className="text-[#9BA3AF] mt-0.5">{heartbeat}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#6B7280]">Responsiveness</span>
            {hasResponsiveness ? (
              <span className={`font-medium ${responsiveness > 80 ? 'text-[#16C784]' : responsiveness > 50 ? 'text-[#FFB020]' : 'text-[#FF3B30]'}`}>{responsiveness}%</span>
            ) : (
              <span className="font-medium text-[#6B7280]">--</span>
            )}
          </div>
          {hasResponsiveness && (
            <div className="h-1 bg-[#1F2226] rounded-full overflow-hidden"><div className={`h-full rounded-full ${responsiveness > 80 ? 'bg-[#16C784]' : responsiveness > 50 ? 'bg-[#FFB020]' : 'bg-[#FF3B30]'}`} style={{ width: `${responsiveness}%` }} /></div>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#6B7280]">Context</span>
            {hasContext ? (
              <span className={`font-medium ${contextPercent > 80 ? 'text-[#FF3B30]' : contextPercent > 60 ? 'text-[#FFB020]' : 'text-[#16C784]'}`}>{contextPercent}%</span>
            ) : (
              <span className="font-medium text-[#6B7280]">--</span>
            )}
          </div>
          {hasContext && (
            <div className="h-1 bg-[#1F2226] rounded-full overflow-hidden"><div className={`h-full rounded-full ${contextPercent > 80 ? 'bg-[#FF3B30]' : contextPercent > 60 ? 'bg-[#FFB020]' : 'bg-[#16C784]'}`} style={{ width: `${contextPercent}%` }} /></div>
          )}
        </div>
      </div>

      {isRestarting && (
        <div className="mb-3 p-3 bg-[#3B82F6]/5 rounded border border-[#3B82F6]/20">
          <div className="flex items-center gap-2 mb-2"><RotateCw className="w-4 h-4 text-[#3B82F6] animate-spin" /><span className="text-xs text-[#3B82F6]">Boost Restart: {restartState.replace('_', ' ')}</span></div>
          <p className="text-[10px] text-[#6B7280]">{restartProgress}</p>
        </div>
      )}

      {/* TRUTH BADGE: Manual protocol required */}
      <div className="mb-3 p-2 bg-[#FFB020]/5 rounded border border-[#FFB020]/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-[#FFB020]" />
          <span className="text-[10px] text-[#FFB020]">Manual protocol required until backend verification complete</span>
        </div>
      </div>

      <button
        onClick={onBoostRestart}
        disabled={true}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-[#1F2226] text-[#6B7280] border border-[#1F2226] cursor-not-allowed"
      >
        <Zap className="w-3.5 h-3.5" />
        Not wired yet
      </button>
    </div>
  );
}
