"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Flag, 
  ArrowLeft, 
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  TrendingUp,
  Target
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
  target_date: string;
  progress: number;
  dependencies: string[];
  tasks_count: number;
  tasks_completed: number;
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
    <button onClick={onClick} className={`px-4 py-2 rounded-lg transition-colors flex items-center ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
      <div className="h-full bg-[#FF6A00] rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

const mockMilestones: Milestone[] = [
  {
    id: "ms-001",
    title: "Executive Ops V1",
    description: "Full executive operations surface with task management, approvals, and calendar",
    status: "in_progress",
    target_date: "2026-03-20",
    progress: 75,
    dependencies: [],
    tasks_count: 12,
    tasks_completed: 9,
  },
  {
    id: "ms-002",
    title: "Knowledge Brain V1",
    description: "Cross-agent knowledge registry with search and embeddings",
    status: "in_progress",
    target_date: "2026-03-22",
    progress: 40,
    dependencies: ["ms-001"],
    tasks_count: 8,
    tasks_completed: 3,
  },
  {
    id: "ms-003",
    title: "Tactical Ops Dashboard",
    description: "Operations center with task graphs, milestones, and productivity metrics",
    status: "completed",
    target_date: "2026-03-18",
    progress: 100,
    dependencies: [],
    tasks_count: 6,
    tasks_completed: 6,
  },
  {
    id: "ms-004",
    title: "Research Intelligence",
    description: "Einstein research surface with competitive intel and market analysis",
    status: "planned",
    target_date: "2026-03-25",
    progress: 10,
    dependencies: ["ms-002"],
    tasks_count: 10,
    tasks_completed: 1,
  },
  {
    id: "ms-005",
    title: "Legal & Compliance",
    description: "Harvey legal surface with contract review and compliance tracking",
    status: "planned",
    target_date: "2026-03-30",
    progress: 0,
    dependencies: ["ms-001", "ms-003"],
    tasks_count: 8,
    tasks_completed: 0,
  },
];

export default function MilestonesPage() {
  const [milestones] = useState<Milestone[]>(mockMilestones);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-[#FF6A00]" />;
      case "delayed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-[#9BA3AF]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planned: "bg-[#9BA3AF]/20 text-[#9BA3AF]",
      in_progress: "bg-[#FF6A00]/20 text-[#FF6A00]",
      completed: "bg-green-500/20 text-green-500",
      delayed: "bg-red-500/20 text-red-500",
    };
    return <Badge className={variants[status] || variants.planned}>{status.replace("_", " ")}</Badge>;
  };

  const completedCount = milestones.filter(m => m.status === "completed").length;
  const inProgressCount = milestones.filter(m => m.status === "in_progress").length;
  const delayedCount = milestones.filter(m => m.status === "delayed").length;
  const totalProgress = milestones.reduce((acc, m) => acc + m.progress, 0) / (milestones.length || 1);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <Button variant="ghost" className="!p-2"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Milestones</h1>
            <p className="text-[#9BA3AF] text-sm">Track key deliverables and project phases</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Milestone</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Target className="w-5 h-5 text-[#9BA3AF]" /><div><p className="text-[#9BA3AF] text-sm">Total</p><p className="text-2xl font-bold text-white">{milestones.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-[#FF6A00]" /><div><p className="text-[#9BA3AF] text-sm">In Progress</p><p className="text-2xl font-bold text-white">{inProgressCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /><div><p className="text-[#9BA3AF] text-sm">Completed</p><p className="text-2xl font-bold text-white">{completedCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-[#FF6A00]" /><div><p className="text-[#9BA3AF] text-sm">Avg Progress</p><p className="text-2xl font-bold text-white">{Math.round(totalProgress)}%</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-white font-medium mb-6">Milestone Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1F2226]" />
            <div className="space-y-6">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="relative pl-12">
                  <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-[#111214] border-2 border-[#FF6A00]" />
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(milestone.status)}
                        <h3 className="text-white font-medium">{milestone.title}</h3>
                        {getStatusBadge(milestone.status)}
                      </div>
                      <p className="text-[#9BA3AF] text-sm mt-1">{milestone.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-[#9BA3AF] flex items-center gap-1"><Calendar className="w-4 h-4" />Target: {new Date(milestone.target_date).toLocaleDateString()}</span>
                        <span className="text-[#9BA3AF]">{milestone.tasks_completed}/{milestone.tasks_count} tasks</span>
                        {milestone.dependencies.length > 0 && <span className="text-[#9BA3AF]">Depends on: {milestone.dependencies.join(", ")}</span>}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1"><span className="text-[#9BA3AF]">Progress</span><span className="text-white">{milestone.progress}%</span></div>
                        <Progress value={milestone.progress} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
