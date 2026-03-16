"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GitBranch, 
  ArrowLeft, 
  Plus, 
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle
} from "lucide-react";
import { TaskGraphVisualization } from "../components/TaskGraphVisualization";

interface Task {
  id: string;
  title: string;
  status: string;
  parent_id: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  priority?: string;
  description?: string;
}

// Simple UI Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 border-b border-[#1F2226] ${className}`}>{children}</div>;
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

function Input({ value, onChange, placeholder, className = "" }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`bg-[#1F2226] border border-[#2A2D32] text-white placeholder:text-[#9BA3AF] px-3 py-2 rounded-lg outline-none focus:border-[#FF6A00] ${className}`}
    />
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks?limit=200");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getChildTasks = (parentId: string | null) => {
    return tasks.filter(t => t.parent_id === parentId);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const rootTasks = filteredTasks.filter(t => t.parent_id === null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-[#FF6A00]" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-[#9BA3AF]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-[#9BA3AF]/20 text-[#9BA3AF]",
      in_progress: "bg-[#FF6A00]/20 text-[#FF6A00]",
      completed: "bg-green-500/20 text-green-500",
      failed: "bg-red-500/20 text-red-500",
    };
    return <Badge className={variants[status] || variants.pending}>{status.replace("_", " ")}</Badge>;
  };

  const renderTaskTree = (parentId: string | null, depth = 0) => {
    const children = getChildTasks(parentId);
    
    return children.map(task => {
      const hasChildren = tasks.some(t => t.parent_id === task.id);
      const isExpanded = expandedTasks.has(task.id);
      
      return (
        <div key={task.id}>
          <div 
            className="flex items-center gap-3 py-2 px-3 hover:bg-[#1F2226] rounded-lg group cursor-pointer"
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
            onClick={() => hasChildren && toggleExpand(task.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-[#9BA3AF]" /> : <ChevronRight className="w-4 h-4 text-[#9BA3AF]" />
            ) : <div className="w-4" />}
            
            {getStatusIcon(task.status)}
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{task.title}</p>
              <p className="text-[#9BA3AF] text-xs">{task.id.slice(0, 8)} • {new Date(task.created_at).toLocaleDateString()}</p>
            </div>
            
            {task.agent_id && <Badge className="border border-[#1F2226] text-[#9BA3AF]">{task.agent_id}</Badge>}
            {getStatusBadge(task.status)}
          </div>
          
          {hasChildren && isExpanded && renderTaskTree(task.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <Button variant="ghost" className="!p-2"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Task Graph</h1>
            <p className="text-[#9BA3AF] text-sm">Parent-child task hierarchy and dependencies</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Task</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-[#9BA3AF] text-sm">Total Tasks</p><p className="text-2xl font-bold text-white">{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[#9BA3AF] text-sm">Root Tasks</p><p className="text-2xl font-bold text-white">{tasks.filter(t => !t.parent_id).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[#9BA3AF] text-sm">Sub-tasks</p><p className="text-2xl font-bold text-white">{tasks.filter(t => t.parent_id).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[#9BA3AF] text-sm">In Progress</p><p className="text-2xl font-bold text-white">{tasks.filter(t => t.status === "in_progress").length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#9BA3AF]" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="flex-1" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? <div className="p-4 text-[#9BA3AF] text-center">Loading...</div> : rootTasks.length === 0 ? <div className="p-4 text-[#9BA3AF] text-center">No tasks</div> : renderTaskTree(null)}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><h3 className="text-white font-medium">Visual Task Graph</h3></CardHeader>
          <CardContent><TaskGraphVisualization tasks={tasks} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
