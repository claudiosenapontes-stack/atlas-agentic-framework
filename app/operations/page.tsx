"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GitBranch, Flag, Users, TrendingUp, ArrowRight, Activity, CheckCircle2, Clock, Server, Database, Layers, RefreshCw, Zap, Target, Cpu, Rocket, AlertCircle } from "lucide-react";

interface Task { id: string; title: string; status: string; agent_id: string | null; created_at: string; }
interface Execution { id: string; status: string; agent_name: string | null; started_at: string; cost_usd?: number; }
interface Agent { name: string; displayName: string; status: string; agentType: string; emoji?: string; currentTask?: string; }
interface SystemHealth { pm2: { status: string; processes: number; online: number }; redis: { status: string; queues: number }; supabase: { status: string; latency: number }; }
interface Mission { id: string; title: string; status: string; phase: string; priority: string; progress_percent: number; closure_confidence: number; owner_agent: string | null; }

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`p-4 ${className}`}>{children}</div>; }
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>; }

const navItems = [
  { href: "/operations/missions", icon: Rocket, title: "Missions", desc: "Henry & Olivia mission rail", color: "text-[#FF6A00]", primary: true },
  { href: "/operations/tasks", icon: GitBranch, title: "Tasks", desc: "Task management", color: "text-blue-400" },
  { href: "/operations/milestones", icon: Flag, title: "Milestones", desc: "Checkpoint timeline", color: "text-green-400" },
  { href: "/operations/delegation", icon: Users, title: "Delegation", desc: "Agent workloads", color: "text-purple-400" },
  { href: "/operations/productivity", icon: TrendingUp, title: "Productivity", desc: "Performance metrics", color: "text-pink-400" },
];

export default function UnifiedOperationsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, execsRes, agentsRes, healthRes, missionsRes] = await Promise.allSettled([
        fetch("/api/tasks?limit=100"),
        fetch("/api/executions?limit=100"),
        fetch("/api/agents/live"),
        fetch("/api/health/detailed"),
        fetch("/api/missions?limit=50"),
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json();
        setTasks(data.tasks || []);
      }
      if (execsRes.status === 'fulfilled' && execsRes.value.ok) {
        const data = await execsRes.value.json();
        setExecutions(data.executions || []);
      }
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const data = await agentsRes.value.json();
        setAgents(data.agents || []);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setHealth(data);
      }
      if (missionsRes.status === 'fulfilled' && missionsRes.value.ok) {
        const data = await missionsRes.value.json();
        setMissions(data.missions || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (error) { 
      console.error("Failed:", error);
      setDataSource('unavailable');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, []);

  const missionMetrics = useMemo(() => {
    const blocked = missions.filter(m => m.status === 'blocked').length;
    const executing = missions.filter(m => m.status === 'executing' || m.status === 'in_progress').length;
    const verifying = missions.filter(m => m.status === 'verifying').length;
    const closed = missions.filter(m => m.status === 'closed').length;
    const avgConfidence = missions.length > 0 
      ? missions.reduce((acc, m) => acc + (m.closure_confidence || 0), 0) / missions.length 
      : 0;
    return { total: missions.length, blocked, executing, verifying, closed, avgConfidence };
  }, [missions]);

  const taskMetrics = useMemo(() => {
    const byStatus = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byAgent = tasks.reduce((acc, t) => {
      const agent = t.agent_id || 'Unassigned';
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const avgTasksPerAgent = agents.length > 0 ? tasks.length / agents.length : 0;
    return { total: tasks.length, inProgress: byStatus.in_progress || 0, completed: byStatus.completed || 0, blocked: byStatus.blocked || 0, byAgent, avgTasksPerAgent };
  }, [tasks, agents]);

  const executionMetrics = useMemo(() => {
    const completed = executions.filter(e => e.status === "completed").length;
    const total = executions.length;
    return { completed, total, successRate: total > 0 ? (completed / total) * 100 : 0, totalCost: executions.reduce((acc, e) => acc + (e.cost_usd || 0), 0) };
  }, [executions]);

  const agentMetrics = useMemo(() => ({ total: agents.length, online: agents.filter(a => a.status === "online").length }), [agents]);

  const getMissionStatusColor = (status: string) => {
    switch (status) {
      case 'blocked': return 'text-red-500';
      case 'executing': return 'text-[#FFB020]';
      case 'verifying': return 'text-[#14B8A6]';
      case 'closed': return 'text-green-500';
      default: return 'text-[#9BA3AF]';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Center</h1>
          <p className="text-[#9BA3AF]">Mission health, milestone progress, task execution, delegation pressure, productivity summary</p>
        </div>
        <div className="flex items-center gap-2">
          {dataSource === 'live' ? (
            <Badge className="bg-green-500/20 text-green-500">Live Data</Badge>
          ) : (
            <Badge className="bg-[#6B7280]/20 text-[#6B7280]">Connection Issue</Badge>
          )}
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Rocket className="w-4 h-4" /> Mission Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Missions", value: missionMetrics.total, color: "text-white" },
            { label: "Executing", value: missionMetrics.executing, color: "text-[#FFB020]" },
            { label: "Verifying", value: missionMetrics.verifying, color: "text-[#14B8A6]" },
            { label: "Blocked", value: missionMetrics.blocked, color: "text-[#FF3B30]" },
            { label: "Closed", value: missionMetrics.closed, color: "text-green-500" },
            { label: "Avg Confidence", value: `${Math.round(missionMetrics.avgConfidence)}%`, color: "text-white" },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className="text-[#9BA3AF] text-xs">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {missions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Recent Missions
            </h2>
            <Link href="/operations/missions" className="text-[#FF6A00] text-sm hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {missions.slice(0, 6).map(mission => (
              <Link key={mission.id} href={`/operations/missions/${mission.id}`}>
                <Card className="hover:border-[#FF6A00]/50 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={mission.priority === 'critical' ? 'bg-red-500/20 text-red-500' : mission.priority === 'high' ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#9BA3AF]/20 text-[#9BA3AF]'}>
                        {mission.priority}
                      </Badge>
                      <span className={`text-xs font-medium ${getMissionStatusColor(mission.status)}`}>{mission.status}</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{mission.title}</p>
                    <p className="text-[#6B7280] text-xs">{mission.id.slice(0, 8)}...</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6B7280]">Progress</span>
                        <span className="text-white">{mission.progress_percent || 0}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6A00] rounded-full" style={{ width: `${mission.progress_percent || 0}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Task Execution Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Tasks", value: taskMetrics.total },
            { label: "In Progress", value: taskMetrics.inProgress, color: "text-[#FFB020]" },
            { label: "Completed", value: taskMetrics.completed, color: "text-green-500" },
            { label: "Blocked Tasks", value: taskMetrics.blocked, color: "text-red-500" },
            { label: "Tasks/Agent", value: taskMetrics.avgTasksPerAgent.toFixed(1), color: "text-[#9BA3AF]" },
            { label: "Success Rate", value: `${executionMetrics.successRate.toFixed(0)}%`, color: "text-green-500" },
            { label: "Executions", value: executionMetrics.total },
            { label: "Agents Online", value: agentMetrics.online, color: "text-green-500" },
            { label: "Cost", value: `$${executionMetrics.totalCost.toFixed(0)}` },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className="text-[#9BA3AF] text-xs">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color || "text-white"}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
