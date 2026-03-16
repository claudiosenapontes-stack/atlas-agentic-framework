"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3,
  GitBranch,
  Flag,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle
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

// Simple UI Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
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

export default function OperationsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, execsRes, agentsRes] = await Promise.all([
        fetch("/api/tasks?limit=100"),
        fetch("/api/executions?limit=100"),
        fetch("/api/agents/live"),
      ]);

      const [tasksData, execsData, agentsData] = await Promise.all([
        tasksRes.json(),
        execsRes.json(),
        agentsRes.json(),
      ]);

      setTasks(tasksData.tasks || []);
      setExecutions(execsData.executions || []);
      setAgents(agentsData.agents || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const completedExecutions = executions.filter(e => e.status === "completed").length;
  const onlineAgents = agents.filter(a => a.status === "online").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tactical Operations</h1>
        <p className="text-[#9BA3AF]">Command center for task orchestration and agent productivity</p>
      </div>

      {/* Navigation Grid — Tasks is primary sub-surface */}
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

      {/* Quick Stats */}
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
              <CheckCircle2 className="w-5 h-5 text-green-500" />
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

      {/* Recent Activity */}
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
                  <Badge className={task.status === "completed" ? "bg-green-500/20 text-green-500" : task.status === "in_progress" ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>
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
                    <p className="text-[#9BA3AF] text-xs">{exec.agent_name || "Unknown"}</p>
                  </div>
                  <Badge className={exec.status === "completed" ? "bg-green-500/20 text-green-500" : exec.status === "failed" ? "bg-red-500/20 text-red-500" : "bg-[#9BA3AF]/20 text-[#9BA3AF]"}>
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
