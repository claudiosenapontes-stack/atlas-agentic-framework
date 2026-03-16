'use client';

import { useState, useEffect } from 'react';
import { Plug, CheckCircle, AlertCircle, RefreshCw, Mail, Calendar, Contact, Globe, MessageSquare, Database, Cloud, Bot } from 'lucide-react';
import { DataStatus } from '@/components/ui/DataStatus';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'partial' | 'missing';
  lastSync: string | null;
  capabilities: string[];
  icon: any;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIntegrations(getDemoIntegrations());
    setLastSync(new Date().toISOString());
    setLoading(false);
  };

  const getDemoIntegrations = (): Integration[] => [
    { id: 'gmail', name: 'Gmail', category: 'google', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(), capabilities: ['Read', 'Send', 'Search'], icon: Mail },
    { id: 'gcalendar', name: 'Google Calendar', category: 'google', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 10).toISOString(), capabilities: ['Read', 'Create', 'Sync'], icon: Calendar },
    { id: 'gcontacts', name: 'Google Contacts', category: 'google', status: 'partial', lastSync: new Date(Date.now() - 1000 * 60 * 60).toISOString(), capabilities: ['Read'], icon: Contact },
    { id: 'meta', name: 'Meta Ads', category: 'meta', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(), capabilities: ['Campaigns', 'Insights', 'Leads'], icon: Globe },
    { id: 'manychat', name: 'ManyChat', category: 'messaging', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 3).toISOString(), capabilities: ['Flows', 'Sequences', 'Broadcasts'], icon: MessageSquare },
    { id: 'brave', name: 'Brave Search API', category: 'ai', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60).toISOString(), capabilities: ['Web Search', 'News', 'Images'], icon: Globe },
    { id: 'perplexity', name: 'Perplexity API', category: 'ai', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60).toISOString(), capabilities: ['Q&A', 'Research', 'Citations'], icon: Bot },
    { id: 'supabase', name: 'Supabase', category: 'infra', status: 'connected', lastSync: new Date(Date.now() - 1000 * 30).toISOString(), capabilities: ['Database', 'Auth', 'Realtime'], icon: Database },
    { id: 'vercel', name: 'Vercel', category: 'infra', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(), capabilities: ['Deploy', 'Preview', 'Analytics'], icon: Cloud },
    { id: 'telegram', name: 'Telegram', category: 'messaging', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(), capabilities: ['Send', 'Receive', 'Bots'], icon: MessageSquare },
    { id: 'whatsapp', name: 'WhatsApp', category: 'messaging', status: 'partial', lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), capabilities: ['Send'], icon: MessageSquare },
    { id: 'openrouter', name: 'OpenRouter', category: 'ai', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60).toISOString(), capabilities: ['LLM', 'Routing', 'Fallback'], icon: Bot },
  ];

  const stats = {
    connected: integrations.filter(i => i.status === 'connected').length,
    partial: integrations.filter(i => i.status === 'partial').length,
    missing: integrations.filter(i => i.status === 'missing').length,
  };

  const categories = [
    { key: 'google', label: 'Google Workspace' },
    { key: 'meta', label: 'Meta Platform' },
    { key: 'messaging', label: 'Messaging' },
    { key: 'ai', label: 'AI Services' },
    { key: 'infra', label: 'Infrastructure' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center"><Plug className="w-5 h-5 text-cyan-500" /></div>
              <h1 className="text-xl font-semibold">Integrations</h1>
              <DataStatus source={source} lastSync={lastSync} syncing={loading} />
            </div>
            <p className="text-xs text-[#6B7280]">Connector status and capabilities</p>
          </div>
          <div className="flex gap-3">
            <StatCard label="Connected" value={stats.connected} color="green" />
            <StatCard label="Partial" value={stats.partial} color="amber" />
            <StatCard label="Missing" value={stats.missing} color="red" />
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {categories.map((cat) => {
          const catIntegrations = integrations.filter(i => i.category === cat.key);
          if (catIntegrations.length === 0) return null;
          return (
            <div key={cat.key}>
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3">{cat.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catIntegrations.map((integration) => <IntegrationCard key={integration.id} integration={integration} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  const statusColors = {
    connected: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: CheckCircle },
    partial: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertCircle },
    missing: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertCircle },
  };
  const status = statusColors[integration.status];
  const StatusIcon = status.icon;

  return (
    <div className={`p-4 rounded-lg border ${status.bg} ${status.border}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#0B0B0C] flex items-center justify-center"><Icon className="w-5 h-5 text-[#9BA3AF]" /></div>
        <div>
          <h3 className="text-sm font-medium text-white">{integration.name}</h3>
          <div className="flex items-center gap-1"><StatusIcon className={`w-3 h-3 ${status.text}`} /><span className={`text-xs ${status.text} capitalize`}>{integration.status}</span></div>
        </div>
      </div>
      {integration.lastSync && (
        <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-3"><RefreshCw className="w-3 h-3" />Last sync: {new Date(integration.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      )}
      <div>
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Capabilities</p>
        <div className="flex flex-wrap gap-1">
          {integration.capabilities.map((cap) => <span key={cap} className="px-2 py-0.5 rounded text-[10px] bg-[#0B0B0C] text-[#9BA3AF]">{cap}</span>)}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = { green: 'bg-green-500/10 border-green-500/30 text-green-400', amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400', red: 'bg-red-500/10 border-red-500/30 text-red-400' };
  return (
    <div className={`px-4 py-2 rounded-lg border ${colors[color]}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}
