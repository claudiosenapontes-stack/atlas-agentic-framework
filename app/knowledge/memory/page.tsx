'use client';

import { useState, useEffect } from 'react';
import { MemoryStick, History, FileText, AlertCircle, Database, Clock } from 'lucide-react';
import Link from 'next/link';

interface MemoryEntry {
  id: string;
  agentId: string;
  agentName: string;
  type: 'session' | 'decision' | 'preference';
  content: string;
  createdAt: string;
  source: string;
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'session' | 'decision' | 'preference'>('all');
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchMemory();
  }, []);

  async function fetchMemory() {
    setLoading(true);
    try {
      // Will connect to memory API when Optimus ships it
      setDataSource('unavailable');
      setEntries([]);
    } catch {
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = entries.filter(e => 
    filter === 'all' ? true : e.type === filter
  );

  const TYPE_ICONS = {
    session: History,
    decision: FileText,
    preference: Database,
  };

  const TYPE_COLORS = {
    session: 'bg-blue-500/10 text-blue-400',
    decision: 'bg-purple-500/10 text-purple-400',
    preference: 'bg-green-500/10 text-green-400',
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <MemoryStick className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Memory</h1>
              <p className="text-sm text-[#6B7280]">Long-term memory and session history</p>
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
          {(['all', 'session', 'decision', 'preference'] as const).map((f) => (
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
            <h3 className="text-sm font-medium text-white mb-1">Memory System Not Connected</h3>
            <p className="text-xs text-[#6B7280] mb-3">
              Memory API is not yet available. Optimus is building the memory registry.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1F2226] rounded-lg">
              <Database className="w-3 h-3 text-[#FF6A00]" />
              <span className="text-xs text-[#9BA3AF]">Awaiting Optimus integration</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[#FF6A00] border-t-transparent rounded-full" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 bg-[#111214] border border-[#1F2226] rounded-[10px] text-center">
            <Clock className="w-8 h-8 text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#9BA3AF]">No memory entries found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const Icon = TYPE_ICONS[entry.type];
              return (
                <div
                  key={entry.id}
                  className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-[#2A2D32] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[entry.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#9BA3AF]">{entry.agentName}</span>
                        <span className="text-xs text-[#6B7280]">•</span>
                        <span className="text-xs text-[#6B7280]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white">{entry.content}</p>
                      <p className="text-xs text-[#6B7280] mt-1">Source: {entry.source}</p>
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
