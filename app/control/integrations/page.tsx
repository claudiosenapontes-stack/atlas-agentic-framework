'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Plug, CheckCircle, AlertCircle, RefreshCw, Mail, Calendar, Contact, Globe, MessageSquare, Database, Cloud, Bot, Zap, Radio, Loader2, XCircle, Wifi, Layers } from 'lucide-react';
import Link from 'next/link';

interface Integration {
  name: string;
  connected: boolean;
  capabilities: string[];
  last_check: string;
  category: string;
  status: 'CONNECTED' | 'AUTH_PENDING' | 'ERROR' | 'DEGRADED';
  error?: string;
}

const categoryIcons: Record<string, any> = {
  core: Zap,
  ai: Bot,
  infra: Database,
  messaging: MessageSquare,
  google: Mail,
};

const categoryLabels: Record<string, string> = {
  core: 'Core Platform',
  ai: 'AI Services',
  infra: 'Infrastructure',
  messaging: 'Messaging',
  google: 'Google Workspace',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.integrations && Array.isArray(data.integrations)) {
          setIntegrations(data.integrations);
          setDataSource('live');
          setLastSync(data.timestamp || new Date().toISOString());
        } else {
          setDataSource('unavailable');
        }
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Integrations] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    connected: integrations.filter(i => i.status === 'CONNECTED').length,
    authPending: integrations.filter(i => i.status === 'AUTH_PENDING').length,
    error: integrations.filter(i => i.status === 'ERROR').length,
    degraded: integrations.filter(i => i.status === 'DEGRADED').length,
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const cat = integration.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

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
          {['Atlas Control','Fleet','Costs','Integrations','Audit','Incident Center'].map((label, i) => {
            const paths = ['/control','/control/fleet','/control/costs','/control/integrations','/control/audit','/control/incidents'];
            return <Link key={label} href={paths[i]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${label === 'Integrations' ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>{label}</Link>;
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"><Plug className="w-5 h-5 text-cyan-500" /></div>
                <h1 className="text-xl font-semibold">Integrations</h1>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${dataSource === 'live' ? 'bg-[#16C784]/10 border-[#16C784]/30' : 'bg-[#6B7280]/10 border-[#6B7280]/30'}`}>
                  {loading ? <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" /> : <span className={`w-1.5 h-1.5 rounded-full ${dataSource === 'live' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />}
                  <span className={`text-[10px] ${dataSource === 'live' ? 'text-[#16C784]' : 'text-[#6B7280]'}`}>{dataSource === 'live' ? `Synced at ${formatLastSync()}` : 'Not connected'}</span>
                </div>
              </div>
              <p className="text-xs text-[#6B7280]">Connector status and capabilities</p>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchIntegrations} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
          </div>
        </div>

        {dataSource === 'unavailable' || integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <Plug className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Integration Status Unavailable</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The integration backend is not yet connected. Real-time connector status 
              will be available once the integration service is fully deployed.
            </p>
            <button onClick={fetchIntegrations} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
              {loading ? 'Checking...' : 'Check Again'}
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard icon={<Wifi className="w-4 h-4" />} label="Connected" value={stats.connected} color="green" />
              <StatCard icon={<AlertCircle className="w-4 h-4" />} label="Auth Pending" value={stats.authPending} color="amber" />
              <StatCard icon={<XCircle className="w-4 h-4" />} label="Error" value={stats.error} color="red" />
              <StatCard icon={<Layers className="w-4 h-4" />} label="Total" value={integrations.length} color="gray" />
            </div>

            {/* Integration Cards by Category */}
            {Object.entries(groupedIntegrations).map(([category, items]) => {
              const CategoryIcon = categoryIcons[category] || Plug;
              return (
                <div key={category} className="mb-6">
                  <h3 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4" />
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((integration) => (
                      <IntegrationCard key={integration.name} integration={integration} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    green: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
    amber: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]',
    red: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
    gray: 'bg-[#6B7280]/10 border-[#6B7280]/30 text-[#6B7280]',
  };
  return (
    <div className={`p-4 rounded-[10px] border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusConfig = {
    CONNECTED: { icon: CheckCircle, color: 'text-[#16C784]', bg: 'bg-[#16C784]/10', border: 'border-[#16C784]/30' },
    AUTH_PENDING: { icon: AlertCircle, color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10', border: 'border-[#FFB020]/30' },
    ERROR: { icon: XCircle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/30' },
    DEGRADED: { icon: AlertCircle, color: 'text-[#FF6A00]', bg: 'bg-[#FF6A00]/10', border: 'border-[#FF6A00]/30' },
  };
  
  const config = statusConfig[integration.status] || statusConfig.AUTH_PENDING;
  const StatusIcon = config.icon;

  return (
    <div className={`p-4 rounded-[10px] border bg-[#111214] ${config.border} hover:border-opacity-50 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h4 className="font-medium text-sm text-white">{integration.name}</h4>
            <p className={`text-[10px] ${config.color}`}>{integration.status.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
      
      {integration.capabilities && integration.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {integration.capabilities.map((cap) => (
            <span key={cap} className="px-2 py-0.5 bg-[#0B0B0C] border border-[#1F2226] rounded text-[10px] text-[#9BA3AF]">
              {cap}
            </span>
          ))}
        </div>
      )}
      
      {integration.error && (
        <p className="text-[10px] text-[#FF3B30] mt-2">{integration.error}</p>
      )}
    </div>
  );
}
