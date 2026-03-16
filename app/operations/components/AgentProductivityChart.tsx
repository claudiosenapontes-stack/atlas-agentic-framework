"use client";

import { useMemo } from "react";

interface Execution {
  id: string;
  status: string;
  agent_name: string | null;
  started_at: string;
  completed_at: string | null;
}

interface Agent {
  name: string;
  status: string;
}

interface AgentProductivityChartProps {
  executions: Execution[];
  agents: Agent[];
}

export function AgentProductivityChart({ executions, agents }: AgentProductivityChartProps) {
  const data = useMemo(() => {
    const agentStats: Record<string, { completed: number; failed: number; total: number }> = {};
    
    agents.forEach(agent => {
      agentStats[agent.name] = { completed: 0, failed: 0, total: 0 };
    });
    
    executions.forEach(exec => {
      const agentName = exec.agent_name || "unassigned";
      if (!agentStats[agentName]) {
        agentStats[agentName] = { completed: 0, failed: 0, total: 0 };
      }
      agentStats[agentName].total++;
      if (exec.status === "completed") {
        agentStats[agentName].completed++;
      } else if (exec.status === "failed") {
        agentStats[agentName].failed++;
      }
    });
    
    return Object.entries(agentStats)
      .map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ...stats,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [executions, agents]);

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[#9BA3AF]">No execution data</div>;
  }

  const maxValue = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="h-64 space-y-3">
      {data.map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-white">{item.name}</span>
            <span className="text-[#9BA3AF]">{item.completed} / {item.total}</span>
          </div>
          <div className="h-6 bg-[#1F2226] rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(item.completed / maxValue) * 100}%` }}
            />
            <div 
              className="h-full bg-red-500 transition-all"
              style={{ width: `${(item.failed / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2 text-xs">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-[#9BA3AF]">Completed</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /><span className="text-[#9BA3AF]">Failed</span></div>
      </div>
    </div>
  );
}
