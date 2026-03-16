'use client';

import { useState, useEffect } from 'react';
import { Cpu, Wrench, Code, Globe, Database, Shield, FileText, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AgentSkill {
  id: string;
  agentId: string;
  agentName: string;
  skill: string;
  category: 'tool' | 'api' | 'integration' | 'domain';
  proficiency: 'learning' | 'proficient' | 'expert';
  lastUsed: string | null;
}

const CATEGORY_ICONS = {
  tool: Wrench,
  api: Code,
  integration: Globe,
  domain: Database,
};

const CATEGORY_COLORS = {
  tool: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  api: 'bg-green-500/10 text-green-400 border-green-500/30',
  integration: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  domain: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const PROFICIENCY_COLORS = {
  learning: 'text-yellow-400',
  proficient: 'text-blue-400',
  expert: 'text-green-400',
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tool' | 'api' | 'integration' | 'domain'>('all');
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    setLoading(true);
    try {
      // This will be replaced with actual API when Optimus ships skills endpoint
      // For now, showing truth: not connected
      setDataSource('unavailable');
      setSkills([]);
    } catch {
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const filteredSkills = skills.filter(s => 
    filter === 'all' ? true : s.category === filter
  );

  const stats = {
    total: skills.length,
    tools: skills.filter(s => s.category === 'tool').length,
    apis: skills.filter(s => s.category === 'api').length,
    integrations: skills.filter(s => s.category === 'integration').length,
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Agent Skills</h1>
              <p className="text-sm text-[#6B7280]">Capabilities and proficiencies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <span className="px-2 py-1 bg-[#16C784]/10 border border-[#16C784]/30 rounded text-xs text-[#16C784]">
                Live
              </span>
            ) : (
              <span className="px-2 py-1 bg-[#6B7280]/10 border border-[#6B7280]/30 rounded text-xs text-[#6B7280]">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'tool', 'api', 'integration', 'domain'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f
                  ? 'bg-[#FF6A00]/20 text-[#FF6A00] font-medium'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {dataSource === 'unavailable' ? (
          <div className="p-8 bg-[#111214] border border-[#1F2226] rounded-[10px] text-center">
            <AlertCircle className="w-8 h-8 text-[#6B7280] mx-auto mb-3" />
            <h3 className="text-sm font-medium text-white mb-1">Skills System Not Connected</h3>
            <p className="text-xs text-[#6B7280] mb-3">
              Agent skills API is not yet available. Optimus is building the skills registry.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1F2226] rounded-lg">
              <Sparkles className="w-3 h-3 text-[#FF6A00]" />
              <span className="text-xs text-[#9BA3AF]">Awaiting Optimus integration</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[#FF6A00] border-t-transparent rounded-full" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="p-8 bg-[#111214] border border-[#1F2226] rounded-[10px] text-center">
            <Wrench className="w-8 h-8 text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#9BA3AF]">No skills found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredSkills.map((skill) => {
              const Icon = CATEGORY_ICONS[skill.category] || Wrench;
              return (
                <div
                  key={skill.id}
                  className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#2A2D32] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${CATEGORY_COLORS[skill.category]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{skill.skill}</p>
                        <p className="text-xs text-[#6B7280]">{skill.agentName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${PROFICIENCY_COLORS[skill.proficiency]}`}>
                        {skill.proficiency}
                      </span>
                      {skill.lastUsed && (
                        <span className="text-xs text-[#6B7280]">
                          Last used {new Date(skill.lastUsed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
