'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Activity, Play, Square, RefreshCw, Terminal, 
  Cpu, MemoryStick, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, Zap, Code
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  displayName: string;
  status: 'online' | 'offline' | 'error' | 'busy';
  uptime: number;
  currentTask: string | null;
  queueDepth: number;
  memoryUsage: number;
  cpuUsage: number;
  pid: number | null;
  restarts: number;
  lastSeen: string | null;
  handlers: string[];
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'busy': return 'bg-amber-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export default function AgentsControlPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agents/profiles', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setAgents(data.agents);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineCount = agents.filter(a => a.status === 'online' || a.status === 'busy').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" />
            Agents Control Center
          </h1>
          <p className="text-gray-400 mt-1">Live agent fleet status</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="mb-6 text-sm text-gray-400">
        Online: {onlineCount}/{agents.length} | Last refresh: {lastRefresh.toLocaleTimeString()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
              <div>
                <h3 className="font-semibold">{agent.displayName}</h3>
                <p className="text-xs text-gray-500 capitalize">{agent.status}</p>
              </div>
            </div>
            
            {agent.currentTask && (
              <div className="bg-purple-500/10 rounded p-2 mb-3 text-sm text-purple-300">
                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                {agent.currentTask}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-[#252525] rounded p-2">
                <div className="text-gray-500 text-xs">Uptime</div>
                {formatUptime(agent.uptime)}
              </div>
              <div className="bg-[#252525] rounded p-2">
                <div className="text-gray-500 text-xs">Memory</div>
                {agent.memoryUsage}MB
              </div>
              <div className="bg-[#252525] rounded p-2">
                <div className="text-gray-500 text-xs">Queue</div>
                {agent.queueDepth}
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              PID: {agent.pid || 'N/A'} | Restarts: {agent.restarts}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
