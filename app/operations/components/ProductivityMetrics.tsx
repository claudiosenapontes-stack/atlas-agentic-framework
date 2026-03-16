"use client";

import { useMemo } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface Execution {
  id: string;
  status: string;
  agent_name: string | null;
  started_at: string;
  completed_at: string | null;
  cost_usd?: number;
}

interface Agent {
  name: string;
  status: string;
}

interface ProductivityMetricsProps {
  executions: Execution[];
  agents: Agent[];
}

export function ProductivityMetrics({ executions, agents }: ProductivityMetricsProps) {
  const agentMetrics = useMemo(() => {
    const metrics: Record<string, {
      total: number;
      completed: number;
      failed: number;
      avgDuration: number;
      totalCost: number;
    }> = {};
    
    agents.forEach(agent => {
      metrics[agent.name] = {
        total: 0,
        completed: 0,
        failed: 0,
        avgDuration: 0,
        totalCost: 0,
      };
    });
    
    const durations: Record<string, number[]> = {};
    
    executions.forEach(exec => {
      const agentName = exec.agent_name || "unassigned";
      if (!metrics[agentName]) {
        metrics[agentName] = {
          total: 0,
          completed: 0,
          failed: 0,
          avgDuration: 0,
          totalCost: 0,
        };
        durations[agentName] = [];
      }
      
      metrics[agentName].total++;
      metrics[agentName].totalCost += exec.cost_usd || 0;
      
      if (exec.status === "completed") {
        metrics[agentName].completed++;
        if (exec.completed_at) {
          const duration = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
          if (!durations[agentName]) durations[agentName] = [];
          durations[agentName].push(duration);
        }
      } else if (exec.status === "failed") {
        metrics[agentName].failed++;
      }
    });
    
    // Calculate averages
    Object.keys(durations).forEach(agent => {
      const agentDurations = durations[agent];
      if (agentDurations.length > 0) {
        metrics[agent].avgDuration = agentDurations.reduce((a, b) => a + b, 0) / agentDurations.length;
      }
    });
    
    return Object.entries(metrics).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...data,
      successRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [executions, agents]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1F2226]">
            <th className="text-left py-3 px-4 text-[#9BA3AF] font-medium">Agent</th>
            <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Total</th>
            <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Completed</th>
            <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Failed</th>
            <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Success Rate</th>
            <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Avg Duration</th>
            <th className="text-right py-3 px-4 text-[#9BA3AF] font-medium">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {agentMetrics.map((metric) => (
            <tr key={metric.name} className="border-b border-[#1F2226] hover:bg-[#1F2226]/50">
              <td className="py-3 px-4 text-white font-medium">{metric.name}</td>
              <td className="py-3 px-4 text-center text-white">{metric.total}</td>
              <td className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1 text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  {metric.completed}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1 text-red-500">
                  <XCircle className="w-4 h-4" />
                  {metric.failed}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`font-medium ${metric.successRate >= 80 ? "text-green-500" : metric.successRate >= 50 ? "text-[#FF6A00]" : "text-red-500"}`}>
                  {metric.successRate.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-4 text-center text-[#9BA3AF]">
                {metric.avgDuration > 0 ? `${(metric.avgDuration / 1000 / 60).toFixed(1)}m` : "—"}
              </td>
              <td className="py-3 px-4 text-right text-white">
                ${metric.totalCost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
