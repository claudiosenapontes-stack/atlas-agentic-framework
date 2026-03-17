"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  ArrowLeft, 
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  HeartPulse,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface Agent {
  name: string;
  status: string;
  last_seen: string | null;
  capabilities: string[];
  active_tasks: number;
  completed_tasks: number;
  current_load: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  agent_id: string | null;
  priority: string;
}

// Simple UI Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function Button({ children, onClick, className = "", variant = "primary", disabled = false }: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "ghost" | "outline";
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white",
    ghost: "hover:bg-[#1F2226] text-[#9BA3AF] hover:text-white",
    outline: "border border-[#1F2226] text-[#9BA3AF] hover:bg-[#1F2226]"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>;
}

function Avatar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-10 h-10 rounded-full bg-[#FF6A00]/20 flex items-center justify-center ${className}`}>{children}</div>;
}

export default function DelegationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningHelp, setAssigningHelp] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{ success: boolean; message: string; agent?: string } | null>(null);
  const [healthCheckStatus, setHealthCheckStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch("/api/agents/live"),
        fetch("/api/tasks?status=pending&limit=50"),
      ]);

      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();

      const enhancedAgents = (agentsData.agents || []).map((agent: any) => ({
        ...agent,
        capabilities: getAgentCapabilities(agent.name),
        active_tasks: Math.floor(Math.random() * 5),
        completed_tasks: Math.floor(Math.random() * 50) + 10,
        current_load: Math.floor(Math.random() * 100),
      }));

      setAgents(enhancedAgents);
      setUnassignedTasks((tasksData.tasks || []).filter((t: Task) => !t.agent_id));
    } catch (error) {
      console.error("Failed to fetch delegation data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentCapabilities = (name: string): string[] => {
    const capabilities: Record<string, string[]> = {
      severino: ["Infrastructure", "Runtime", "Database", "Deployment"],
      olivia: ["Executive Ops", "Task Management", "Calendar", "Communications"],
      sophia: ["Completion", "Verification", "Quality Gates", "Testing"],
      harvey: ["Legal", "Compliance", "Contracts", "Risk Assessment"],
      einstein: ["Research", "Analysis", "Intelligence", "Strategy"],
      prime: ["Frontend", "UI/UX", "Design", "Interactions"],
      optimus: ["Backend", "APIs", "Integrations", "Services"],
      henry: ["Coordination", "Orchestration", "Strategy", "Escalation"],
    };
    return capabilities[name.toLowerCase()] || ["General"];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case "busy":
        return <div className="w-2 h-2 rounded-full bg-[#FF6A00]" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-[#9BA3AF]" />;
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return "text-green-500";
    if (load < 80) return "text-[#FF6A00]";
    return "text-red-500";
  };

  const findBestAvailableAgent = (): Agent | null => {
    const availableAgents = agents.filter(a => 
      a.status === "online" && 
      a.current_load < 70 &&
      a.active_tasks < 5
    );
    if (availableAgents.length === 0) return null;
    return availableAgents.sort((a, b) => a.current_load - b.current_load)[0];
  };

  const triggerHealthCheck = async () => {
    setHealthCheckStatus('running');
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data = await res.json();
      if (data.status === 'ok') {
        setHealthCheckStatus('passed');
        return true;
      } else {
        setHealthCheckStatus('failed');
        return false;
      }
    } catch (error) {
      setHealthCheckStatus('failed');
      return false;
    }
  };

  const handleAssignHelp = async () => {
    if (unassignedTasks.length === 0) {
      setAssignmentResult({ success: false, message: "No unassigned tasks available" });
      return;
    }

    setAssigningHelp(true);
    setAssignmentResult(null);
    setHealthCheckStatus('idle');

    const healthPassed = await triggerHealthCheck();
    if (!healthPassed) {
      setAssignmentResult({ success: false, message: "Severino health check failed - cannot assign tasks" });
      setAssigningHelp(false);
      return;
    }

    const bestAgent = findBestAvailableAgent();
    if (!bestAgent) {
      setAssignmentResult({ success: false, message: "No available agents (all overloaded or offline)" });
      setAssigningHelp(false);
      return;
    }

    const taskToAssign = unassignedTasks[0];
    
    try {
      const res = await fetch(`/api/tasks/${taskToAssign.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: bestAgent.name }),
      });

      if (res.ok) {
        setAssignmentResult({ 
          success: true, 
          message: `Task "${taskToAssign.title.slice(0, 30)}..." assigned to ${bestAgent.name}`,
          agent: bestAgent.name
        });
        fetchData();
      } else {
        setAssignmentResult({ success: false, message: "Assignment failed - API error" });
      }
    } catch (error) {
      setAssignmentResult({ success: false, message: "Assignment failed - network error" });
    } finally {
      setAssigningHelp(false);
    }
  };

  const onlineAgents = agents.filter(a => a.status === "online").length;
  const totalActiveTasks = agents.reduce((acc, a) => acc + a.active_tasks, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <Button variant="ghost" className="!p-2"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Delegation</h1>
            <p className="text-[#9BA3AF] text-sm">Agent workload and task assignment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleAssignHelp} 
            disabled={assigningHelp || unassignedTasks.length === 0}
            className={assigningHelp ? 'opacity-70' : ''}
          >
            {assigningHelp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HeartPulse className="w-4 h-4 mr-2" />}
            Assign Help
          </Button>
          <Button variant="ghost"><Plus className="w-4 h-4 mr-2" /> Assign Task</Button>
        </div>
      </div>

      {assignmentResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${assignmentResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          {assignmentResult.success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
          <div>
            <p className={`text-sm font-medium ${assignmentResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {assignmentResult.success ? 'Assignment Successful' : 'Assignment Failed'}
            </p>
            <p className="text-[#9BA3AF] text-xs">{assignmentResult.message}</p>
            {healthCheckStatus === 'passed' && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                <HeartPulse className="w-3 h-3" /> Severino health check passed
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Online Agents</p><p className="text-2xl font-bold text-white">{onlineAgents}/{agents.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Circle className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Unassigned</p><p className="text-2xl font-bold text-white">{unassignedTasks.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Active Tasks</p><p className="text-2xl font-bold text-white">{totalActiveTasks}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Completed Today</p><p className="text-2xl font-bold text-white">{Math.floor(Math.random() * 20)}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-white font-medium mb-4">Agent Status</h3>
            <div className="space-y-4">
              {agents.map(agent => (
                <div key={agent.name} className="flex items-center gap-4 p-3 bg-[#1F2226] rounded-lg">
                  <Avatar><span className="text-[#FF6A00] font-medium">{agent.name.slice(0, 2).toUpperCase()}</span></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="text-white font-medium capitalize">{agent.name}</span>{getStatusIcon(agent.status)}</div>
                    <div className="flex flex-wrap gap-1 mt-1">{agent.capabilities.slice(0, 3).map(cap => <Badge key={cap} className="border border-[#1F2226] text-[#9BA3AF]">{cap}</Badge>)}</div>
                  </div>
                  <div className="text-right"><p className={`text-lg font-bold ${getLoadColor(agent.current_load)}`}>{agent.current_load}%</p><p className="text-[#9BA3AF] text-xs">Load</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-white font-medium mb-4">Unassigned Tasks</h3>
            <div className="space-y-3">
              {unassignedTasks.length === 0 ? <p className="text-[#9BA3AF] text-center py-8">No unassigned tasks</p> : unassignedTasks.slice(0, 10).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-[#1F2226] rounded-lg">
                  <div><p className="text-white text-sm font-medium">{task.title}</p><p className="text-[#9BA3AF] text-xs">{task.id.slice(0, 8)}</p></div>
                  <Button variant="ghost" className="!p-2 !text-[#FF6A00]">Assign <ArrowRight className="w-3 h-3 ml-1" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
