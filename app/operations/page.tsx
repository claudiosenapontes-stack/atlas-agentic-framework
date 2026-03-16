"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GitBranch, Flag, Users, TrendingUp, ArrowRight, Activity, CheckCircle2, Clock, Server, Database, Layers, RefreshCw, Zap, Target, Cpu } from "lucide-react";

interface Task { id: string; title: string; status: string; agent_id: string | null; created_at: string; }
interface Execution { id: string; status: string; agent_name: string | null; started_at: string; cost_usd?: number; }
interface Agent { name: string; displayName: string; status: string; agentType: string; emoji?: string; currentTask?: string; }
interface SystemHealth { pm2: { status: string; processes: number; online: number }; redis: { status: string; queues: number }; supabase: { status: string; latency: number }; }

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`p-4 ${className}`}>{children}</div>; }
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`px-4 py-3 border-b border-[#1F2226] ${className}`}>{children}</div>; }
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>; }

const navItems = [
  { href: "/operations/tasks", icon: GitBranch, title: "Tasks", desc: "Task management", color: "text-blue-400", primary: true },
  { href: "/operations/milestones", icon: Flag, title: "Milestones", desc: "Project phases", color: "text-green-400" },
  { href: "/operations/delegation", icon: Users, title: "Delegation", desc: "Agent workloads", color: "text-purple-400" },
  { href: "/operations/productivity", icon: TrendingUp, title: "Productivity", desc: "Performance metrics", color: "text-[#FF6A00]" },
];

export default function UnifiedOperationsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, execsRes, agentsRes, healthRes] = await Promise.all([
        fetch("/api/tasks?limit=100"), fetch("/api/executions?limit=100"),
        fetch("/api/agents/live"), fetch("/api/health/detailed"),
      ]);
      const [tasksData, execsData, agentsData, healthData] = await Promise.all([tasksRes.json(), execsRes.json(), agentsRes.json(), healthRes.json()]);
      setTasks(tasksData.tasks || []); setExecutions(execsData.executions || []); setAgents(agentsData.agents || []); setHealth(healthData);
    } catch (error) { console.error("Failed:", error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, []);

  const taskMetrics = useMemo(() => {
    const byStatus = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return { total: tasks.length, inProgress: byStatus.in_progress || 0, completed: byStatus.completed || 0, blocked: byStatus.blocked || 0 };
  }, [tasks]);

  const executionMetrics = useMemo(() => {
    const completed = executions.filter(e => e.status === "completed").length;
    const total = executions.length;
    return { completed, total, successRate: total > 0 ? (completed / total) * 100 : 0, totalCost: executions.reduce((acc, e) => acc + (e.cost_usd || 0), 0) };
  }, [executions]);

  const agentMetrics = useMemo(() => ({ total: agents.length, online: agents.filter(a => a.status === "online").length }), [agents]);

  const getHealthBadge = (status: string, type: 'pm2' | 'redis' | 'supabase') => {
    if (!health) return 'bg-[#6B7280]/20 text-[#6B7280]';
    const isGood = (type === 'pm2' && health.pm2.online === health.pm2.processes && health.pm2.processes > 0) || (type === 'redis' && status === 'connected') || (type === 'supabase' && status === 'connected');
    return isGood ? 'bg-[#16C784]/20 text-[#16C784]' : 'bg-[#FF3B30]/20 text-[#FF3B30]';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Center</h1>
          <p className="text-[#9BA3AF]">Unified runtime health, task orchestration, and agent metrics</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className={`hover:border-[#FF6A00]/50 transition-colors cursor-pointer group ${item.primary ? 'border-[#FF6A00]/30 bg-[#FF6A00]/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${item.primary ? 'bg-[#FF6A00]/20' : 'bg-[#1F2226]'} ${item.color}`}><Icon className="w-5 h-5" /></div>
                    <ArrowRight className={`w-4 h-4 ${item.primary ? 'text-[#FF6A00]' : 'text-[#9BA3AF]'} group-hover:text-[#FF6A00] transition-colors ml-auto`} />
                  </div>
                  <h3 className="text-white font-medium mt-3">{item.title}</h3>
                  <p className="text-[#9BA3AF] text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section>
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Key Performance Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[{ label: "Tasks", value: taskMetrics.total }, { label: "In Progress", value: taskMetrics.inProgress, color: "text-[#FFB020]" }, { label: "Completed", value: taskMetrics.completed, color: "text-green-500" }, { label: "Blocked", value: taskMetrics.blocked, color: "text-red-500" }, { label: "Success Rate", value: `${executionMetrics.successRate.toFixed(0)}%`, color: "text-green-500" }, { label: "Executions", value: executionMetrics.total }, { label: "Agents Online", value: agentMetrics.online, color: "text-green-500" }, { label: "Cost", value: `$${executionMetrics.totalCost.toFixed(0)}` }].map((kpi, i) => (
            <Card key={i}><CardContent className="p-3"><p className="text-[#9BA3AF] text-xs">{kpi.label}</p><p className={`text-xl font-bold ${kpi.color || "text-white"}`}>{kpi.value}</p></CardContent></Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Runtime Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Server className="w-4 h-4 text-[#9BA3AF]" /><span className="text-sm font-medium text-white">PM2</span></div><Badge className={getHealthBadge(health?.pm2?.status || '', 'pm2')}>{health ? `${health.pm2.online}/${health.pm2.processes}` : '—'}</Badge></div>
              <div className="text-2xl font-bold text-white">{health?.pm2?.processes || '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Layers className="w-4 h-4 text-[#9BA3AF]" /><span className="text-sm font-medium text-white">Redis</span></div><Badge className={getHealthBadge(health?.redis?.status || '', 'redis')}>{health?.redis?.status || '—'}</Badge></div>
              <div className="text-2xl font-bold text-white">{health?.redis?.queues || '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Database className="w-4 h-4 text-[#9BA3AF]" /><span className="text-sm font-medium text-white">Supabase</span></div><Badge className={getHealthBadge(health?.supabase?.status || '', 'supabase')}>{health ? `${health.supabase.latency}ms` : '—'}</Badge></div>
              <div className="text-2xl font-bold text-white capitalize">{health?.supabase?.status || '—'}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2"><Cpu className="w-4 h-4" /> Fleet Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {agents.slice(0, 12).map((agent) => (
            <Card key={agent.name} className={agent.status === "online" ? "border-green-500/30" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2"><span className="text-lg">{agent.emoji || "🤖"}</span><div className={`w-2 h-2 rounded-full ${agent.status === "online" ? "bg-green-500" : "bg-[#6B7280]"}`} /></div>
                <p className="text-white text-sm font-medium">{agent.displayName}</p>
                <p className="text-[#9BA3AF] text-xs">{agent.agentType}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="text-white font-medium">Recent Tasks</h3></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.slice(0, 6).map(task => (
                <Link key={task.id} href={`/operations/tasks/${task.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-[#1F2226] last:border-0 hover:bg-[#1F2226]/50 px-2 -mx-2 rounded cursor-pointer">
                    <div><p className="text-white text-sm truncate">{task.title}</p><p className="text-[#9BA3AF] text-xs">{task.agent_id || "Unassigned"}</p></div>
                    <Badge className={task.status === "completed" ? "bg-green-500/20 text-green-500" : task.status === "in_progress" ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>{task.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="text-white font-medium">Recent Executions</h3></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {executions.slice(0, 6).map(exec => (
                <div key={exec.id} className="flex items-center justify-between py-2 border-b border-[#1F2226] last:border-0">
                  <div><p className="text-white text-sm">{exec.id.slice(0, 8)}</p><p className="text-[#9BA3AF] text-xs">{exec.agent_name || "Unknown"}</p></div>
                  <Badge className={exec.status === "completed" ? "bg-green-500/20 text-green-500" : exec.status === "failed" ? "bg-red-500/20 text-red-500" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>{exec.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
