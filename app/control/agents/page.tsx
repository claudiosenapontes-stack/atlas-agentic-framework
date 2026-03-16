'use client';

import { useState, useEffect } from 'react';
import { User, Brain, Code, MessageSquare, Settings, AlertCircle, RefreshCw, CheckCircle2, XCircle, Layers, Zap } from "lucide-react";

interface AgentProfile {
  id: string;
  name: string;
  display_name: string;
  role: string;
  description: string;
  skills: string[];
  capabilities: string[];
  model: string;
  provider: string;
  status: 'active' | 'inactive' | 'degraded';
  routing_enabled: boolean;
  last_config_update: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('mock');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAgentProfiles();
  }, []);

  async function fetchAgentProfiles() {
    setLoading(true);
    try {
      // Try live endpoint first
      const res = await fetch('/api/agents/profiles', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setDataSource('live');
        setLastUpdated(new Date());
      } else {
        // Fall back to mock data with truth badge
        setAgents(getMockProfiles());
        setDataSource('mock');
      }
    } catch {
      setAgents(getMockProfiles());
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  }

  function getMockProfiles(): AgentProfile[] {
    return [
      {
        id: '1',
        name: 'optimus-prime',
        display_name: 'Optimus Prime',
        role: 'Infrastructure Lead',
        description: 'DevOps, security, and system architecture specialist.',
        skills: ['Docker', 'Kubernetes', 'AWS', 'Security', 'CI/CD'],
        capabilities: ['deploy', 'monitor', 'audit', 'remediate'],
        model: 'kimi-k2.5',
        provider: 'openrouter',
        status: 'active',
        routing_enabled: true,
        last_config_update: '2026-03-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'harvey',
        display_name: 'Harvey',
        role: 'Finance Lead',
        description: 'Financial operations, compliance, and legal matters.',
        skills: ['Accounting', 'Compliance', 'Contracts', 'Legal Research'],
        capabilities: ['analyze', 'review', 'approve', 'report'],
        model: 'kimi-k2.5',
        provider: 'openrouter',
        status: 'active',
        routing_enabled: true,
        last_config_update: '2026-03-14T08:30:00Z'
      },
      {
        id: '3',
        name: 'henry',
        display_name: 'Henry',
        role: 'Executive Coordinator',
        description: 'Calendar, communications, and executive operations.',
        skills: ['Scheduling', 'Email', 'Travel', 'Research'],
        capabilities: ['schedule', 'draft', 'research', 'coordinate'],
        model: 'kimi-k2',
        provider: 'openrouter',
        status: 'active',
        routing_enabled: true,
        last_config_update: '2026-03-13T14:00:00Z'
      }
    ];
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">Agents</h1>
              <span className="text-[10px] px-2 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-full uppercase tracking-wider">Profiles</span>
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">Skills, capabilities, model routing, and configuration</p>
          </div>
          <div className="flex items-center gap-3">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                <span className="text-xs text-[#16C784]">Live Config</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#6B7280]/10 border border-[#6B7280]/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">Mock Data</span>
              </div>
            )}
            <button 
              onClick={fetchAgentProfiles} 
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Truth Badge for Mock Data */}
        {dataSource === 'mock' && (
          <div className="mb-6 p-3 bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FFB020]" />
            <div className="flex-1">
              <p className="text-sm text-[#FFB020] font-medium">Agent profile API not yet implemented</p>
              <p className="text-xs text-[#6B7280]">Showing mock data for UI development. Backend endpoint: /api/agents/profiles</p>
            </div>
          </div>
        )}

        {/* Agent Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[#6B7280] animate-spin mb-4" />
            <p className="text-sm text-[#9BA3AF]">Loading agent profiles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map(agent => (
              <AgentProfileCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Model Routing Section */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-4">Model Routing Configuration</h2>
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-[#6B7280]" />
                <span className="text-white font-medium">Active Routing Rules</span>
              </div>
              <span className="text-xs text-[#6B7280]">Provider: OpenRouter</span>
            </div>
            <div className="space-y-2">
              <RoutingRule pattern="optimus-prime, harvey, prime" model="kimi-k2.5" priority="High" />
              <RoutingRule pattern="henry, sophia, einstein" model="kimi-k2" priority="Normal" />
              <RoutingRule pattern="background, cron, heartbeat" model="kimi-k2" priority="Low" />
            </div>
            <div className="mt-4 pt-4 border-t border-[#1F2226] flex items-center gap-2 text-xs text-[#6B7280]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Routing configuration stored in config/routing.ts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentProfileCard({ agent }: { agent: AgentProfile }) {
  const isActive = agent.status === 'active';
  
  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5 hover:border-[#6B7280]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#16C784]/10' : 'bg-[#1F2226]'}`}>
            <User className={`w-5 h-5 ${isActive ? 'text-[#16C784]' : 'text-[#6B7280]'}`} />
          </div>
          <div>
            <h3 className="font-medium text-white">{agent.display_name}</h3>
            <p className="text-xs text-[#6B7280]">@{agent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#16C784] animate-pulse' : 'bg-[#6B7280]'}`} />
          <span className={`text-xs ${isActive ? 'text-[#16C784]' : 'text-[#6B7280]'}`}>{agent.status}</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Role</p>
        <p className="text-sm text-[#9BA3AF]">{agent.role}</p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Description</p>
        <p className="text-sm text-[#9BA3AF]">{agent.description}</p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Brain className="w-3 h-3" /> Skills
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.skills.map(skill => (
            <span key={skill} className="px-2 py-0.5 bg-[#0B0B0C] border border-[#1F2226] rounded text-xs text-[#9BA3AF]">{skill}</span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Capabilities
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map(cap => (
            <span key={cap} className="px-2 py-0.5 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded text-xs text-[#3B82F6]">{cap}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1F2226]">
        <div>
          <p className="text-[10px] text-[#6B7280] mb-1">Model</p>
          <p className="text-xs text-white">{agent.model}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] mb-1">Provider</p>
          <p className="text-xs text-white capitalize">{agent.provider}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] mb-1">Routing</p>
          <p className={`text-xs ${agent.routing_enabled ? 'text-[#16C784]' : 'text-[#6B7280]'}`}>
            {agent.routing_enabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] mb-1">Last Update</p>
          <p className="text-xs text-[#9BA3AF]">{new Date(agent.last_config_update).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function RoutingRule({ pattern, model, priority }: { pattern: string; model: string; priority: string }) {
  const priorityColors: Record<string, string> = {
    High: 'text-[#FF3B30]',
    Normal: 'text-[#FFB020]',
    Low: 'text-[#16C784]'
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-[#0B0B0C] rounded-lg border border-[#1F2226]">
      <div className="flex items-center gap-3">
        <Code className="w-4 h-4 text-[#6B7280]" />
        <span className="text-sm text-[#9BA3AF]">{pattern}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-white">{model}</span>
        <span className={`text-xs ${priorityColors[priority]}`}>{priority}</span>
      </div>
    </div>
  );
}