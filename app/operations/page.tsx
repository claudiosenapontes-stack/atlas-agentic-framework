"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GitBranch,
  Flag,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Database,
  Layers,
  RefreshCw
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  parent_id: string | null;
  agent_id: string | null;
  created_at: string;
}

interface Execution {
  id: string;
  status: string;
  agent_name: string | null;
  started_at: string;
}

interface Agent {
  name: string;
  status: string;
}

interface SystemHealth {
  pm2: { status: string; processes: number; online: number };
  redis: { status: string; queues: number; memory: string };
  supabase: { status: string; latency: number };
  queues: Record<string, number>;
  timestamp: string;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-3 border-b border-[#1F2226] ${className}`}>{children}</div>;
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>;
}

const navItems = [
  { href: "/operations/tasks", icon: GitBranch, title: "Tasks", desc: "Task graph and work management", color: "text-blue-400", primary: true },
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
    try {
      const [tasksRes, execsRes, agentsRes, healthRes] = await Promise.all([
        fetch("/api/tasks?limit=100"),
        fetch("/api/executions?limit=100"),
        fetch("/api/agents/live"),
        fetch("/api/health/detailed"),
      ]);

      const [tasksData, execsData, agentsData, healthData] = await Promise.all([
        tasksRes.json(),
        execsRes.json(),
        agentsRes.json(),
        healthRes.json(),
      ]);

      setTasks(tasksData.tasks || []);
      setExecutions(execsData.executions || []);
      setAgents(agentsData.agents || []);
      setHealth(healthData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const onlineAgents = agents.filter(a => a.status === "online").length;

  const getHealthBadgeClass = (status: string, type: 'pm2' | 'redis' | 'supabase') => {
    if (!health) return 'bg-[#6B7280]/20 text-[#6B7280]';
    const isGood = 
      (type === 'pm2' && health.pm2.online === health.pm2.processes) ||
      (type === 'redis' && status === 'connected') ||
      (type === 'supabase' && status === 'connected');
    return isGood ? 'bg-[#16C784]/20 text-[#16C784]' : 'bg-[#FF3B30]/20 text-[#FF3B30]';
  };

  const getQueueBadgeClass = (depth: number) => {
    if (depth > 10) return 'bg-[#FF3B30]/20 text-[#FF3B30]';
    if (depth > 0) return 'bg-[#FFB020]/20 text-[#FFB020]';
    return 'bg-[#6B7280]/20 text-[#6B7280]';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Center</h1>
          <p className="text-[#9BA3AF]">Unified view: runtime health, task orchestration, and agent metrics</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
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
                    <div className={`p-2 rounded-lg ${item.primary ? 'bg-[#FF6A00]/20' : 'bg-[#1F2226]'} ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {item.primary && <span className="text-[9px] px-1.5 py-0.5 bg-[#FF6A00]/20 text-[#FF6A00] rounded">PRIMARY</span>}
                    <ArrowRight className={`w-4 h-4 ${item.primary ? 'text-[#FF6A00]' : 'text-[#9BA3AF]'} group-hover:text-[#FF6A00] transition-colors ${item.primary ? '' : 'ml-auto'}`} />
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
          <Activity className="w-4 h-4" />
          Runtime Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#9BA3AF]" />
                  <span className="text-sm font-medium text-white">PM2 Services</span>
                </div>
                <Badge className={getHealthBadgeClass(health?.pm2?.status || '', 'pm2')}>
                  {health ? `${health.pm2.online}/${health.pm2.processes}` : '—'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white">{health?.pm2?.processes || '—'}</div>
              <p className="text-xs text-[#6B7280]">Total processes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#9BA3AF]" />
                  <span className="text-sm font-medium text-white">Redis</span>
                </div>
                <Badge className={getHealthBadgeClass(health?.redis?.status || '', 'redis')}>
                  {health?.redis?.status || '—'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white">{health?.redis?.queues || '—'}</div>
              <p className="text-xs text-[#6B7280]">Active queues</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#9BA3AF]" />
                  <span className="text-sm font-medium text-white">Supabase</span>
                </div>
                <Badge className={getHealthBadgeClass(health?.supabase?.status || '', 'supabase')}>
                  {health ? `${health.supabase.latency}ms` : '—'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white capitalize">{health?.supabase?.status || '—'}</div>
              <p className="text-xs text-[#6B7280]">Database latency</p>
            </CardContent>
          </Card>
        </div>

        {health && (
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#9BA3AF]" />
                <span className="font-medium text-white">Queue Depths</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(health.queues).map(([queue, depth]) => (
                  <div key={queue} className="flex justify-between items-center p-2.5 bg-[#0B0B0C] rounded-lg">
                    <span className="text-xs font-medium text-[#9BA3AF] capitalize">{queue.replace(/_/g, ' ')}</span>
                    <Badge className={getQueueBadgeClass(depth)}>{depth}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Task Orchestration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#FF6A00]" />
                <div>
                  <p className="text-[#9BA3AF] text-sm">Total Tasks</p>
                  <p className="text-2xl font-bold text-white">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#FF6A00]" />
                <div>
                  <p className="text-[#9BA3AF] text-sm">In Progress</p>
                  <p className="text-2xl font-bold text-white">{inProgressTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#16C784]" />
                <div>
                  <p className="text-[#9BA3AF] text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{completedTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-[#9BA3AF] text-sm">Online Agents</p>
                  <p className="text-2xl font-bold text-white">{onlineAgents}/{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-white font-medium mb-4">Recent Tasks</h3>
            <div className="space-y-2">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-[#1F2226] last:border-0">
                  <div>
                    <p className="text-white text-sm truncate">{task.title}</p>
                    <p className="text-[#9BA3AF] text-xs">{task.agent_id || "Unassigned"}</p>
                  </div>
                  <Badge className={task.status === "completed" ? "bg-[#16C784]/20 text-[#16C784]" : task.status === "in_progress" ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>
                    {task.status}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-[#9BA3AF] text-center py-4">No tasks found</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-white font-medium mb-4">Recent Executions</h3>
            <div className="space-y-2">
              {executions.slice(0, 5).map(exec => (
                <div key={exec.id} className="flex items-center justify-between py-2 border-b border-[#1F2226] last:border-0">
                  <div>
                    <p className="text-white text-sm">{exec.id.slice(0, 8)}</p>
                    <p className="text-[#
9BA3AF] text-xs">{exec.agent_name || "Unknown"}</p>
                  </div>
                  <Badge className={exec.status === "completed" ? "bg-[#16C784]/20 text-[#16C784]" : exec.status === "failed" ? "bg-[#FF3B30]/20 text-[#FF3B30]" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>
                    {exec.status}
                  </Badge>
                </div>
              ))}
              {executions.length === 0 && <p className="text-[#9BA3AF] text-center py-4">No executions found</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
