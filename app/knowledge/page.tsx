'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Brain, Cpu, MemoryStick, FileText, Sparkles, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

interface KnowledgeStats {
  totalAgents: number;
  totalSkills: number;
  memoryEntries: number;
  lastSync: string | null;
}

export default function KnowledgePage() {
  const [stats, setStats] = useState<KnowledgeStats>({
    totalAgents: 0,
    totalSkills: 0,
    memoryEntries: 0,
    lastSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/agents/live', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalAgents: data.agents?.length || 0,
          totalSkills: 0, // Will be populated from skills API
          memoryEntries: 0, // Will be populated from memory API
          lastSync: new Date().toISOString(),
        });
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch {
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const realmCards = [
    {
      title: 'Agent Skills',
      description: 'Browse and manage agent capabilities, tools, and specializations',
      href: '/knowledge/skills',
      icon: Cpu,
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      status: 'Available',
    },
    {
      title: 'Memory',
      description: 'Long-term memory storage and session history across agents',
      href: '/knowledge/memory',
      icon: MemoryStick,
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      status: 'API Ready',
    },
    {
      title: 'SOUL.md',
      description: 'Agent identity definitions, personas, and behavioral guidelines',
      href: '/knowledge/soul',
      icon: FileText,
      color: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      status: 'Available',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Knowledge Brain</h1>
              <p className="text-sm text-[#6B7280]">Agent memory, skills, and identity</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Active Agents</span>
            </div>
            <p className="text-2xl font-semibold text-white">
              {loading ? '-' : stats.totalAgents}
            </p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Agent Skills</span>
            </div>
            <p className="text-2xl font-semibold text-white">
              {loading ? '-' : stats.totalSkills || '—'}
            </p>
          </div>
          <div className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <MemoryStick className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Memory Entries</span>
            </div>
            <p className="text-2xl font-semibold text-white">
              {loading ? '-' : stats.memoryEntries || '—'}
            </p>
          </div>
        </div>

        {/* Realm Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {realmCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group p-5 bg-gradient-to-br ${card.color} border ${card.borderColor} rounded-[10px] hover:opacity-90 transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                    {card.status}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-white mb-1">{card.title}</h3>
                <p className="text-sm text-white/60">{card.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Documentation */}
        <div className="mt-8 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-[#FF6A00]" />
            <span className="text-sm font-medium text-white">Knowledge System</span>
          </div>
          <p className="text-xs text-[#6B7280] mb-3">
            The Knowledge Brain stores agent identities (SOUL.md), learned skills, and long-term memory. 
            Each agent has a dedicated workspace with persistent memory across sessions.
          </p>
          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              Workspace: /root/.openclaw/workspaces/
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
