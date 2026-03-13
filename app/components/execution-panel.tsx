'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, PauseCircle, Terminal } from 'lucide-react';
import Link from 'next/link';

interface Execution {
  id: string;
  task_id: string;
  agent_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  output_preview?: string;
  error_message?: string;
}

interface ExecutionPanelProps {
  maxItems?: number;
  refreshInterval?: number;
  taskId?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  pending: { 
    icon: <Clock className="w-3.5 h-3.5" />, 
    color: 'text-[#6B7280]', 
    bg: 'bg-[#1F2226]', 
    label: 'Pending' 
  },
  running: { 
    icon: <Play className="w-3.5 h-3.5" />, 
    color: 'text-[#FFB020]', 
    bg: 'bg-[#FFB020]/10', 
    label: 'Running' 
  },
  completed: { 
    icon: <CheckCircle className="w-3.5 h-3.5" />, 
    color: 'text-[#16C784]', 
    bg: 'bg-[#16C784]/10', 
    label: 'Done' 
  },
  failed: { 
    icon: <XCircle className="w-3.5 h-3.5" />, 
    color: 'text-[#FF3B30]', 
    bg: 'bg-[#FF3B30]/10', 
    label: 'Failed' 
  },
  cancelled: { 
    icon: <PauseCircle className="w-3.5 h-3.5" />, 
    color: 'text-[#FFB020]', 
    bg: 'bg-[#FFB020]/10', 
    label: 'Cancelled' 
  },
};

export function ExecutionPanel({ maxItems = 10, refreshInterval = 5000, taskId }: ExecutionPanelProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('active');

  const fetchExecutions = async () => {
    try {
      const url = new URL('/api/executions', window.location.origin);
      if (taskId) url.searchParams.set('taskId', taskId);
      url.searchParams.set('limit', String(maxItems));
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch executions');
      
      const data = await response.json();
      setExecutions(data.executions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
    const interval = setInterval(fetchExecutions, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, taskId]);

  const filteredExecutions = executions.filter((exec) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'running'].includes(exec.status);
    if (filter === 'completed') return exec.status === 'completed';
    if (filter === 'failed') return ['failed', 'cancelled'].includes(exec.status);
    return true;
  });

  const displayExecutions = filteredExecutions.slice(0, maxItems);

  const runningCount = executions.filter(e => e.status === 'running').length;

  if (isLoading) {
    return (
      <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-[#9BA3AF]" />
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase">Executions</h2>
        </div>
        <div className="flex items-center justify-center h-32 text-[#6B7280]">
          Loading executions...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#9BA3AF]" />
            <h2 className="text-xs font-medium text-[#9BA3AF] uppercase">Executions</h2>
            <span className="text-xs text-[#6B7280]">({runningCount})</span>
          </div>
          
          <Link
            href="/executions"
            className="text-xs text-[#6B7280] hover:text-white transition-colors"
          >
            All →
          </Link>
        </div>
        
        <div className="flex gap-1 mt-2">
          {['active', 'completed', 'failed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded capitalize transition-colors ${
                filter === f
                  ? 'bg-[#1F2226] text-white'
                  : 'bg-[#0B0B0C] text-[#6B7280] hover:text-[#9BA3AF]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 text-[#FF3B30] text-xs">Error: {error}</div>
      ) : displayExecutions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#6B7280] text-xs">
          No executions
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-[#1F2226]">
            {displayExecutions.map((exec) => {
              const statusConfig = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
              
              return (
                <div
                  key={exec.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#0B0B0C] transition-colors"
                >
                  <div className={`p-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white truncate">
                        {exec.agent_id}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#6B7280] font-mono">
                        {exec.task_id.slice(0, 8)}...
                      </span>
                      {exec.output_preview && (
                        <span className="text-[10px] text-[#9BA3AF] truncate">
                          {exec.output_preview.slice(0, 40)}
                        </span>
                      )}
                      {exec.error_message && (
                        <span className="text-[10px] text-[#FF3B30] truncate">
                          {exec.error_message.slice(0, 40)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-[#6B7280] shrink-0">
                    {new Date(exec.started_at).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
