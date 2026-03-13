'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Database, Users, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  services: {
    api: { status: string; latency: number };
    database: { status: string; latency: number };
    agents: { online: number; total: number };
  };
}

interface HealthSummaryProps {
  refreshInterval?: number;
}

export function HealthSummary({ refreshInterval = 10000 }: HealthSummaryProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setIsLoading(true);
      
      const startTime = performance.now();
      const [healthData, agentsData] = await Promise.all([
        fetch('/api/health').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/agents/live').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      const latency = Math.round(performance.now() - startTime);

      const onlineAgents = agentsData?.onlineCount || 0;
      const totalAgents = agentsData?.count || 0;

      const overallStatus: HealthStatus['status'] = 
        onlineAgents === 0 ? 'unhealthy' :
        onlineAgents < totalAgents / 2 ? 'degraded' :
        'healthy';

      setHealth({
        status: overallStatus,
        lastChecked: new Date(),
        services: {
          api: { 
            status: healthData?.status === 'ok' ? 'operational' : 'degraded', 
            latency 
          },
          database: { 
            status: healthData?.checks?.supabase?.status === 'ok' ? 'connected' : 'disconnected', 
            latency 
          },
          agents: { online: onlineAgents, total: totalAgents },
        },
      });
    } catch {
      setHealth({
        status: 'unhealthy',
        lastChecked: new Date(),
        services: {
          api: { status: 'unknown', latency: 0 },
          database: { status: 'unknown', latency: 0 },
          agents: { online: 0, total: 0 },
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-[#16C784]" />;
      case 'degraded': return <AlertCircle className="w-4 h-4 text-[#FFB020]" />;
      case 'unhealthy': return <XCircle className="w-4 h-4 text-[#FF3B30]" />;
      default: return <Activity className="w-4 h-4 text-[#6B7280]" />;
    }
  };

  const getStatusBadge = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]';
      case 'degraded': return 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]';
      case 'unhealthy': return 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]';
      default: return 'bg-[#1F2226] border-[#1F2226] text-[#6B7280]';
    }
  };

  if (isLoading && !health) {
    return (
      <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-[#1F2226] rounded w-1/2"></div>
          <div className="h-6 bg-[#1F2226] rounded"></div>
          <div className="h-6 bg-[#1F2226] rounded"></div>
        </div>
      </div>
    );
  }

  const h = health!;

  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(h.status)}
            <span className="text-xs font-medium text-white">System Health</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusBadge(h.status)}`}>
            {h.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between py-1.5 border-b border-[#1F2226]">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs text-[#9BA3AF]">API</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${h.services.api.status === 'operational' ? 'text-[#16C784]' : 'text-[#FFB020]'}`}>
              {h.services.api.status}
            </span>
            <span className="text-[10px] text-[#6B7280]">{h.services.api.latency}ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-[#1F2226]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs text-[#9BA3AF]">Database</span>
          </div>
          <span className={`text-xs ${h.services.database.status === 'connected' ? 'text-[#16C784]' : 'text-[#FF3B30]'}`}>
            {h.services.database.status}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs text-[#9BA3AF]">Agents</span>
          </div>
          <span className="text-xs text-white">
            {h.services.agents.online}/{h.services.agents.total}
          </span>
        </div>
      </div>
    </div>
  );
}
