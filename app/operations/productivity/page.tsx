"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  ArrowLeft, 
  Zap,
  Clock,
  Target,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { AgentProductivityChart } from "../components/AgentProductivityChart";
import { ExecutionThroughput } from "../components/ExecutionThroughput";

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

// Simple UI Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function Button({ children, onClick, className = "", variant = "primary" }: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "ghost" | "outline";
}) {
  const variants = {
    primary: "bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white",
    ghost: "hover:bg-[#1F2226] text-[#9BA3AF] hover:text-white",
    outline: "border border-[#1F2226] text-[#9BA3AF] hover:bg-[#1F2226]"
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg transition-colors ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>;
}

export default function ProductivityPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [execsRes, agentsRes] = await Promise.all([
        fetch("/api/executions?limit=500"),
        fetch("/api/agents/live"),
      ]);

      const execsData = await execsRes.json();
      const agentsData = await agentsRes.json();

      setExecutions(execsData.executions || []);
      setAgents(agentsData.agents || []);
    } catch (error) {
      console.error("Failed to fetch productivity data:", error);
    }
  };

  const completedExecutions = executions.filter(e => e.status === "completed").length;
  const failedExecutions = executions.filter(e => e.status === "failed").length;
  const successRate = executions.length > 0 ? (completedExecutions / executions.length) * 100 : 0;
  
  const avgExecutionTime = executions
    .filter(e => e.completed_at)
    .reduce((acc, e) => {
      const start = new Date(e.started_at).getTime();
      const end = new Date(e.completed_at!).getTime();
      return acc + (end - start);
    }, 0) / (executions.filter(e => e.completed_at).length || 1);

  const totalCost = executions.reduce((acc, e) => acc + (e.cost_usd || 0), 0);

  const agentMetrics = useMemo(() => {
    const metrics: Record<string, { total: number; completed: number; failed: number; totalCost: number }> = {};
    
    agents.forEach(agent => {
      metrics[agent.name] = { total: 0, completed: 0, failed: 0, totalCost: 0 };
    });
    
    executions.forEach(exec => {
      const agentName = exec.agent_name || "unassigned";
      if (!metrics[agentName]) {
        metrics[agentName] = { total: 0, completed: 0, failed: 0, totalCost: 0 };
      }
      metrics[agentName].total++;
      metrics[agentName].totalCost += exec.cost_usd || 0;
      if (exec.status === "completed") metrics[agentName].completed++;
      else if (exec.status === "failed") metrics[agentName].failed++;
    });
    
    return Object.entries(metrics).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...data,
      successRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [executions, agents]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <Button variant="ghost" className="!p-2"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Productivity</h1>
            <p className="text-[#9BA3AF] text-sm">Agent performance and execution metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["24h", "7d", "30d"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "primary" : "outline"}
              onClick={() => setTimeRange(range as "24h" | "7d" | "30d")}
              className={timeRange === range ? "" : "!text-[#9BA3AF]"}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Zap className="w-5 h-5 text-[#FF6A00]" /><div><p className="text-[#9BA3AF] text-sm">Total</p><p className="text-2xl font-bold text-white">{executions.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Target className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Success Rate</p><p className="text-2xl font-bold text-white">{successRate.toFixed(1)}%</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Avg Duration</p><p className="text-2xl font-bold text-white">{(avgExecutionTime / 1000 / 60).toFixed(1)}m</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Total Cost</p><p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-white font-medium">Agent Productivity</h3><Badge className="border border-[#1F2226] text-[#9BA3AF]">By Task Completion</Badge></div>
            <AgentProductivityChart executions={executions} agents={agents} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-white font-medium">Execution Throughput</h3><Badge className="border border-[#1F2226] text-[#9BA3AF]">Over Time</Badge></div>
            <ExecutionThroughput executions={executions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-white font-medium mb-4">Detailed Productivity Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2226]">
                  <th className="text-left py-3 px-4 text-[#9BA3AF] font-medium">Agent</th>
                  <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Total</th>
                  <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Completed</th>
                  <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Failed</th>
                  <th className="text-center py-3 px-4 text-[#9BA3AF] font-medium">Success Rate</th>
                  <th className="text-right py-3 px-4 text-[#9BA3AF] font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.map((metric) => (
                  <tr key={metric.name} className="border-b border-[#1F2226] hover:bg-[#1F2226]/50">
                    <td className="py-3 px-4 text-white font-medium">{metric.name}</td>
                    <td className="py-3 px-4 text-center text-white">{metric.total}</td>
                    <td className="py-3 px-4 text-center text-green-500"><span className="flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" />{metric.completed}</span></td>
                    <td className="py-3 px-4 text-center text-red-500"><span className="flex items-center justify-center gap-1"><XCircle className="w-4 h-4" />{metric.failed}</span></td>
                    <td className="py-3 px-4 text-center"><span className={`font-medium ${metric.successRate >= 80 ? "text-green-500" : metric.successRate >= 50 ? "text-[#FF6A00]" : "text-red-500"}`}>{metric.successRate.toFixed(1)}%</span></td>
                    <td className="py-3 px-4 text-right text-white">${metric.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
