'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Radio, AlertCircle, RefreshCw, Zap, Send, Inbox } from 'lucide-react';
import Link from 'next/link';

interface Communication {
  id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchCommunications();
  }, []);

  async function fetchCommunications() {
    setLoading(true);
    try {
      const res = await fetch('/api/communications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCommunications(data.communications || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Communications] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const inbound = communications.filter(c => c.direction === 'inbound').length;
  const outbound = communications.filter(c => c.direction === 'outbound').length;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Atlas</h1>
              <p className="text-[10px] text-[#6B7280]">Agentic Framework</p>
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
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Communications</h1>
              <p className="text-sm text-[#6B7280]">Cross-channel message tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
              <Inbox className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs text-[#3B82F6]">{inbound} In</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
              <Send className="w-4 h-4 text-[#16C784]" />
              <span className="text-xs text-[#16C784]">{outbound} Out</span>
            </div>
            <button onClick={fetchCommunications} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Communications Not Connected</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The communications backend is not yet available. Cross-channel message tracking will appear once the service is deployed.
            </p>
            <button onClick={fetchCommunications} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <MessageSquare className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No communications found</p>
            <p className="text-xs text-[#6B7280] mt-1">Messages will appear here when received</p>
          </div>
        ) : (
          <div className="space-y-2">
            {communications.map((comm) => (
              <CommRow key={comm.id} comm={comm} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CommRow({ comm }: { comm: Communication }) {
  const statusColors = { sent: 'bg-[#3B82F6]/10 text-[#3B82F6]', delivered: 'bg-[#16C784]/10 text-[#16C784]', failed: 'bg-[#FF3B30]/10 text-[#FF3B30]' };
  const directionIcon = comm.direction === 'inbound' ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />;
  const directionColor = comm.direction === 'inbound' ? 'text-[#3B82F6]' : 'text-[#16C784]';

  return (
    <div className="flex items-center gap-3 p-3 bg-[#111214] border border-[#1F2226] rounded-lg hover:border-[#6B7280]/30 transition-colors">
      <div className={`${directionColor}`}>{directionIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{comm.content}</p>
        <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
          <span>{comm.channel}</span>
          <span>•</span>
          <span>{comm.sender}</span>
          <span>•</span>
          <span>{new Date(comm.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <div className={`px-2 py-0.5 rounded text-[10px] ${statusColors[comm.status]}`}>{comm.status}</div>
    </div>
  );
}
