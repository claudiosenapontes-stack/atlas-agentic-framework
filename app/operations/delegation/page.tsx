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
  CheckCircle,
  Clock
} from "lucide-react";

interface Agent {
  name: string;
  status: string;
  last_seen: string | null;
  capabilities: string[];
  active_tasks: number;
  completed_tasks: number;
  current_load: number;
  queue_depth?: number;
  success_rate?: number;
  is_overloaded?: boolean;
  is_failing?: boolean;
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
      const [agentsRes, tasksRes, execsRes] = await Promise.all([
        fetch("/api/agents/live"),
        fetch("/api/tasks?limit=200"),
        fetch("/api/executions?limit=100"),
      ]);

      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      const execsData = await execsRes.json();

      const allTasks = tasksData.tasks || [];
      const executions = execsData.executions || [];

      // Calculate real metrics per agent
      const agentTaskCounts: Record<string, number> = {};
      const agentQueueCounts: Record<string, number> = {};
      
      allTasks.forEach((task: Task) => {
        if (task.agent_id) {
          if (task.status === 'in_progress' || task.status === 'active') {
            agentTaskCounts[task.agent_id] = (agentTaskCounts[task.agent_id] || 0) + 1;
          } else if (task.status === 'pending' || task.status === 'inbox') {
            agentQueueCounts[task.agent_id] = (agentQueueCounts[task.agent_id] || 0) + 1;
          }
        }
      });

      // Calculate success rates per agent
      const agentExecs: Record<string, { total: number; success: number }> = {};
      executions.forEach((exec: any) => {
        const agentName = exec.agent_name || 'unknown';
        if (!agentExecs[agentName]) agentExecs[agentName] = { total: 0, success: 0 };
        agentExecs[agentName].total++;
        if (exec.status === 'completed') agentExecs[agentName].success++;
      });

      const enhancedAgents = (agentsData.agents || []).map((agent: any) => {
        const activeTasks = agentTaskCounts[agent.name] || 0;
        const queueDepth = agentQueueCounts[agent.name] || 0;
        const execStats = agentExecs[agent.name] || { total: 0, success: 0 };
        const successRate = execStats.total > 0 ? Math.round((execStats.success / execStats.total) * 100) : 100;
        const currentLoad = Math.min(100, (activeTasks * 20) + (queueDepth * 10));
        
        return {
          ...agent,
          capabilities: getAgentCapabilities(agent.name),
          active_tasks: activeTasks,
          queue_depth: queueDepth,
          completed_tasks: execStats.success,
          current_load: currentLoad,
          success_rate: successRate,
          is_overloaded: activeTasks > 5 || queueDepth > 3 || currentLoad > 80,
          is_failing: successRate < 50,
        };
      });

      setAgents(enhancedAgents);
      setUnassignedTasks(allTasks.filter((t: Task) => !t.agent_id && (t.status === 'pending' || t.status === 'inbox')));
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
      !a.is_overloaded &&
      !a.is_failing &&
      a.current_load < 70 &&
      a.active_tasks < 5 &&
      (a.queue_depth || 0) < 3
    );
    if (availableAgents.length === 0) return null;
    // Sort by lowest load, then by lowest queue depth
    return availableAgents.sort((a, b) => {
      const loadDiff = a.current_load - b.current_load;
      if (loadDiff !== 0) return loadDiff;
      return (a.queue_depth || 0) - (b.queue_depth || 0);
    })[0];
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
  const totalQueueDepth = agents.reduce((acc, a) => acc + (a.queue_depth || 0), 0);
  const failingAgents = agents.filter(a => a.is_failing).length;
  const overloadedAgents = agents.filter(a => a.is_overloaded).length;
  
  // Integrity: Tasks with missing ownership
  const integrityIssues = unassignedTasks.filter(t => !t.agent_id && t.status !== 'completed');

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Online Agents</p><p className="text-2xl font-bold text-white">{onlineAgents}/{agents.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Circle className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Unassigned</p><p className="text-2xl font-bold text-white">{unassignedTasks.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Active Tasks</p><p className="text-2xl font-bold text-white">{totalActiveTasks}</p></div></div></CardContent></Card>
        <Card className={totalQueueDepth > 10 ? 'border-yellow-500/30 bg-yellow-500/5' : ''}><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className={`w-5 h-5 ${totalQueueDepth > 10 ? 'text-yellow-500' : 'text-[#9BA3AF]'}`} /><div><p className="text-[#9BA3AF] text-sm">Queue Depth</p><p className={`text-2xl font-bold ${totalQueueDepth > 10 ? 'text-yellow-500' : 'text-white'}`}>{totalQueueDepth}</p></div></div></CardContent></Card>
        <Card className={failingAgents > 0 ? 'border-red-500/30 bg-red-500/5' : ''}><CardContent className="p-4"><div className="flex items-center gap-3"><AlertCircle className={`w-5 h-5 ${failingAgents > 0 ? 'text-red-500' : 'text-green-500'}`} /><div><p className="text-[#9BA3AF] text-sm">Failing Agents</p><p className={`text-2xl font-bold ${failingAgents > 0 ? 'text-red-500' : 'text-green-500'}`}>{failingAgents}</p></div></div></CardContent></Card>
      </div>

      {integrityIssues.length > 0 && (
        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-400">Ownership Integrity Warning</p>
            <p className="text-[#9BA3AF] text-xs">{integrityIssues.length} task{integrityIssues.length > 1 ? 's' : ''} missing agent assignment</p>
            <div className="mt-2 space-y-1">
              {integrityIssues.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between text-xs">
                  <span className="text-white truncate max-w-[200px]">{task.title}</span>
                  <span className="text-[#6B7280]">{task.id.slice(0, 8)}</span>
                </div>
              ))}
              {integrityIssues.length > 3 && (
                <p className="text-[#6B7280] text-xs">...and {integrityIssues.length - 3} more</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-white font-medium mb-4">Agent Status</h3>
            <div className="space-y-4">
              {agents.map(agent => (
                <div key={agent.name} className={`flex items-center gap-4 p-3 rounded-lg ${agent.is_failing ? 'bg-red-500/10 border border-red-500/30' : agent.is_overloaded ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-[#1F2226]'}`}>
                  <Avatar className={agent.is_failing ? 'bg-red-500/20' : agent.is_overloaded ? 'bg-yellow-500/20' : ''}>
                    <span className={`font-medium ${agent.is_failing ? 'text-red-500' : agent.is_overloaded ? 'text-yellow-500' : 'text-[#FF6A00]'}`}>{agent.name.slice(0, 2).toUpperCase()}</span>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium capitalize">{agent.name}</span>
                      {getStatusIcon(agent.status)}
                      {agent.is_failing && <Badge className="bg-red-500/20 text-red-500 text-[10px]">{agent.success_rate}% FAILING</Badge>}
                      {agent.is_overloaded && !agent.is_failing && <Badge className="bg-yellow-500/20 text-yellow-500 text-[10px]">OVERLOADED</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">{agent.capabilities.slice(0, 3).map(cap => <Badge key={cap} className="border border-[#1F2226] text-[#9BA3AF]">{cap}</Badge>)}</div>
                    <div className="flex gap-3 mt-2 text-[10px] text-[#9BA3AF]">
                      <span>Active: {agent.active_tasks}</span>
                      <span>Queue: {agent.queue_depth || 0}</span>
                      <span>Completed: {agent.completed_tasks}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${agent.is_failing ? 'text-red-500' : getLoadColor(agent.current_load)}`}>{agent.current_load}%</p>
                    <p className="text-[#9BA3AF] text-xs">Load</p>
                  </div>
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
