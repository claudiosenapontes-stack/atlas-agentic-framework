'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ClaimExecutionFlow {
  taskId: string;
  taskTitle: string;
  claimedBy: string | null;
  claimStatus: 'unclaimed' | 'claiming' | 'claimed';
  executionStatus: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
}

interface ClaimExecutionStripProps {
  refreshInterval?: number;
}

export function ClaimExecutionStrip({ refreshInterval = 3000 }: ClaimExecutionStripProps) {
  const [flows, setFlows] = useState<ClaimExecutionFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlows = async () => {
    try {
      // Fetch recent tasks that are in progress or claimed
      const tasksRes = await fetch('/api/tasks?status=claimed,in_progress&limit=5');
      const tasksData = await tasksRes.json();
      
      // Fetch recent executions
      const execsRes = await fetch('/api/executions?limit=5');
      const execsData = await execsRes.json();

      // Map tasks to flows
      const flows: ClaimExecutionFlow[] = (tasksData.tasks || []).map((task: any) => {
        const execution = (execsData.executions || []).find(
          (e: any) => e.task_id === task.id
        );

        return {
          taskId: task.id,
          taskTitle: task.title,
          claimedBy: task.assigned_agent_id,
          claimStatus: task.assigned_agent_id ? 'claimed' : 'unclaimed',
          executionStatus: execution?.status || 'pending',
          startedAt: execution?.started_at || null,
        };
      });

      setFlows(flows);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
    const interval = setInterval(fetchFlows, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading) {
    return (
      <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
        <div className="flex items-center gap-2 text-[#6B7280]">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-[10px]">Loading...</span>
        </div>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Claim → Execute</span>
          <span className="text-[10px] text-[#6B7280]">No active</span>
        </div>
      </div>
    );
  }

  // Only show first flow to keep it compact in header
  const flow = flows[0];

  return (
    <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
      <div className="flex items-center gap-2">
        {/* Task */}
        <div className="flex-1 min-w-0 bg-[#0B0B0C] rounded px-2 py-1">
          <p className="text-[10px] text-[#9BA3AF] truncate">{flow.taskTitle}</p>
        </div>

        {/* Arrow */}
        <div className="text-[#6B7280]">→</div>

        {/* Claim Step */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
          flow.claimStatus === 'claimed'
            ? 'bg-[#16C784]/10 text-[#16C784]'
            : 'bg-[#1F2226] text-[#6B7280]'
        }`}>
          <UserCheck className="w-3 h-3" />
          <span className="hidden sm:inline">{flow.claimedBy ? 'Claimed' : 'Open'}</span>
        </div>

        {/* Arrow */}
        <div className="text-[#6B7280]">→</div>

        {/* Execution Step */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
          flow.executionStatus === 'running'
            ? 'bg-[#FFB020]/10 text-[#FFB020]'
            : flow.executionStatus === 'completed'
            ? 'bg-[#16C784]/10 text-[#16C784]'
            : flow.executionStatus === 'failed'
            ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
            : 'bg-[#1F2226] text-[#6B7280]'
        }`}>
          {flow.executionStatus === 'running' && <Play className="w-3 h-3" />}
          {flow.executionStatus === 'completed' && <CheckCircle className="w-3 h-3" />}
          {flow.executionStatus === 'failed' && <XCircle className="w-3 h-3" />}
          {flow.executionStatus === 'pending' && <div className="w-3 h-3 rounded-full bg-current opacity-30" />}
          <span className="capitalize">{flow.executionStatus}</span>
        </div>
      </div>
    </div>
  );
}
