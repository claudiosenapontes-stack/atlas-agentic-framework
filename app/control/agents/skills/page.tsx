'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  BookOpen, 
  Wrench, 
  ExternalLink,
  Lightbulb,
  Brain,
  Activity,
  ChevronRight
} from 'lucide-react';

interface AgentSkillData {
  id: string;
  title: string;
  realm: string;
  emoji: string;
  soulConfigured: boolean;
  toolsConfigured: boolean;
  runtimeStatus: 'online' | 'offline' | 'unknown';
  pid?: number;
  uptime?: string;
  installedSkills: string[];
  availableSkills: number;
  suggestedSkills: string[];
  memoryFiles: number;
}

interface SkillsResponse {
  success: boolean;
  agents: AgentSkillData[];
  availableSkills: string[];
  skillsHubUrl: string;
  timestamp: string;
}

const statusColors = {
  online: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  offline: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
  unknown: 'bg-[#9BA3AF]/10 text-[#9BA3AF] border-[#9BA3AF]/30'
};

const statusIcons = {
  online: CheckCircle,
  offline: XCircle,
  unknown: AlertCircle
};

export default function AgentSkillsPage() {
  const [data, setData] = useState<SkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSkillsData();
  }, []);

  async function fetchSkillsData() {
    try {
      setLoading(true);
      const res = await fetch('/api/agents/skills', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load agent skills');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6B7280]">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Loading agent skills...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF3B30]" />
            <div>
              <p className="text-[#FF3B30] font-medium">Error loading agent skills</p>
              <p className="text-[#9BA3AF] text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onlineCount = data?.agents.filter(a => a.runtimeStatus === 'online').length || 0;
  const configuredCount = data?.agents.filter(a => a.soulConfigured && a.toolsConfigured).length || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      {/* Header */}
      <div className="border-b border-[#1F2226] bg-[#111214]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/control"
                className="text-[#6B7280] hover:text-white transition-colors text-sm"
              >
                Control
              </Link>
              <ChevronRight className="w-4 h-4 text-[#6B7280]" />
              <span className="text-white font-medium">Agent Skills</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-[#16C784]" />
                <span className="text-xs text-[#16C784] font-medium">
                  {onlineCount}/{data?.agents.length} Online
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg">
                <Brain className="w-4 h-4 text-[#9BA3AF]" />
                <span className="text-xs text-[#9BA3AF] font-medium">
                  {data?.availableSkills.length} Skills Available
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-4">Agent Skills & Configuration</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Monitor agent identity, tools, and skill configurations across the Atlas fleet
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
              <p className="text-xs text-[#6B7280] uppercase tracking-wide">Total Agents</p>
              <p className="text-2xl font-semibold text-white mt-1">{data?.agents.length}</p>
            </div>
            <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
              <p className="text-xs text-[#6B7280] uppercase tracking-wide">Fully Configured</p>
              <p className="text-2xl font-semibold text-[#16C784] mt-1">{configuredCount}</p>
            </div>
            <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
              <p className="text-xs text-[#6B7280] uppercase tracking-wide">Online Runtime</p>
              <p className="text-2xl font-semibold text-[#16C784] mt-1">{onlineCount}</p>
            </div>
            <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
              <p className="text-xs text-[#6B7280] uppercase tracking-wide">Available Skills</p>
              <p className="text-2xl font-semibold text-[#9BA3AF] mt-1">{data?.availableSkills.length}</p>
            </div>
          </div>

          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.agents.map(agent => {
              const StatusIcon = statusIcons[agent.runtimeStatus];
              return (
                <div 
                  key={agent.id}
                  className="bg-[#111214] border border-[#1F2226] rounded-lg p-5 hover:border-[#2A2E33] transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div>
                        <h3 className="text-white font-medium">{agent.title}</h3>
                        <p className="text-xs text-[#6B7280]">{agent.realm}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-2 py-1 rounded border ${statusColors[agent.runtimeStatus]}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium capitalize">{agent.runtimeStatus}</span>
                    </div>
                  </div>

                  {/* Configuration Status */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`flex items-center gap-2 p-2 rounded border ${agent.soulConfigured ? 'bg-[#16C784]/5 border-[#16C784]/20' : 'bg-[#FF3B30]/5 border-[#FF3B30]/20'}`}>
                      <BookOpen className={`w-4 h-4 ${agent.soulConfigured ? 'text-[#16C784]' : 'text-[#FF3B30]'}`} />
                      <span className={`text-xs ${agent.soulConfigured ? 'text-[#16C784]' : 'text-[#FF3B30]'}`}>
                        SOUL.md {agent.soulConfigured ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded border ${agent.toolsConfigured ? 'bg-[#16C784]/5 border-[#16C784]/20' : 'bg-[#FF3B30]/5 border-[#FF3B30]/20'}`}>
                      <Wrench className={`w-4 h-4 ${agent.toolsConfigured ? 'text-[#16C784]' : 'text-[#FF3B30]'}`} />
                      <span className={`text-xs ${agent.toolsConfigured ? 'text-[#16C784]' : 'text-[#FF3B30]'}`}>
                        TOOLS.md {agent.toolsConfigured ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>

                  {/* Runtime Info */}
                  {(agent.pid || agent.uptime) && (
                    <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-4">
                      {agent.pid && <span>PID: {agent.pid}</span>}
                      {agent.uptime && <span>Uptime: {agent.uptime}</span>}
                      <span>Memory files: {agent.memoryFiles}</span>
                    </div>
                  )}

                  {/* Installed Skills */}
                  {agent.installedSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6B7280] mb-2">Installed Skills ({agent.installedSkills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.installedSkills.slice(0, 5).map(skill => (
                          <span 
                            key={skill}
                            className="px-2 py-1 bg-[#1F2226] text-[#9BA3AF] text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {agent.installedSkills.length > 5 && (
                          <span className="px-2 py-1 text-[#6B7280] text-xs">
                            +{agent.installedSkills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested Skills */}
                  {agent.suggestedSkills.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-[#FFB020]" />
                        <p className="text-xs text-[#FFB020]">Suggested</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.suggestedSkills.map(skill => (
                          <span 
                            key={skill}
                            className="px-2 py-1 bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#1F2226]">
                    <span className="text-xs text-[#6B7280]">
                      {agent.availableSkills} skills available
                    </span>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="flex items-center gap-1 text-xs text-[#9BA3AF] hover:text-white transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Skills Hub Link */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-[#9BA3AF]" />
              <div>
                <p className="text-white font-medium">OpenClaw Skills Hub</p>
                <p className="text-xs text-[#6B7280]">Discover and install new skills for your agents</p>
              </div>
            </div>
            <a 
              href={data?.skillsHubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1F2226] hover:bg-[#2A2E33] text-white text-sm rounded-lg transition-colors"
            >
              Visit Hub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
