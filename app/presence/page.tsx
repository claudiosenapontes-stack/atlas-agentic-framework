'use client';

import { useState, useEffect } from 'react';
import { Users, Radio, AlertCircle, RefreshCw, Zap, Activity } from 'lucide-react';
import Link from 'next/link';

interface PresenceData {
  status: string;
  last_seen: string;
  current_task?: string;
}

export default function PresencePage() {
  const [presence, setPresence] = useState<Record<string, PresenceData>>({});
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchPresence();
  }, []);

  async function fetchPresence() {
    setLoading(true);
    try {
      const res = await fetch('/api/presence', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPresence(data.presence || {});
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Presence] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const agents = [
    { name: 'henry', displayName: 'Henry', role: 'CEO' },
    { name: 'olivia', displayName: 'Olivia', role: 'Executive Assistant' },
    { name: 'harvey', displayName: 'Harvey', role: 'Finance' },
    { name: 'sophia', displayName: 'Sophia', role: 'Marketing' },
    { name: 'einstein', displayName: 'Einstein', role: 'Research' },
    { name: 'optimus', displayName: 'Optimus', role: 'Tech Lead' },
    { name: 'prime', displayName: 'Prime', role: 'Senior Dev' },
    { name: 'severino', displayName: 'Severino', role: 'Operations' },
  ];

  const activeCount = Object.keys(presence).length;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Agents</h1>
              <p className="text-[10px] text-[#6B7280]">Agent Directory & Skills</p>
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
          {['Agents', 'Presence', 'Queue', 'ACL'].map((label) => {
            const paths: Record<string, string> = { Agents: '/agents', Presence: '/presence', Queue: '/queue', ACL: '/acl' };
            const isActive = label === 'Presence';
            return (
              <Link key={label} href={paths[label]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${isActive ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Agent Presence</h1>
              <p className="text-sm text-[#6B7280]">Live status and activity monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
              <div className="w-1.5 h-1.5 bg-[#16C784] rounded-full animate-pulse" />
              <span className="text-xs text-[#16C784] font-medium">{activeCount}/{agents.length} Online</span>
            </div>
            <button onClick={fetchPresence} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Presence System Not Available</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The presence tracking backend is not yet connected. Real-time agent status will appear once the service is deployed.
            </p>
            <button onClick={fetchPresence} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {agents.map((agent) => {
              const pres = presence[agent.name];
              const isOnline = pres && pres.status === 'online';
              return (
                <div key={agent.name} className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isOnline ? 'bg-[#16C784]/10' : 'bg-[#1F2226]'}`}>
                      <Users className={`w-4 h-4 ${isOnline ? 'text-[#16C784]' : 'text-[#6B7280]'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-white">{agent.displayName}</h3>
                      <p className="text-[10px] text-[#6B7280]">{agent.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
                    <span className={isOnline ? 'text-[#16C784]' : 'text-[#6B7280]'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {pres?.current_task && (
                    <p className="mt-2 text-[10px] text-[#6B7280] truncate">{pres.current_task}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
