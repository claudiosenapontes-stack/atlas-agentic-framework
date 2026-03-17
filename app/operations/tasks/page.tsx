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
  AlertCircle,
  List,
  BarChart3
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
  assigned_agent?: { display_name: string };
  blocked_since?: string;
  stuck_duration?: number;
  mission_id?: string;
  mission?: { id: string; title: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [missions, setMissions] = useState<Record<string, { id: string; title: string }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "graph" | "stats">("list");

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const [tasksRes, missionsRes] = await Promise.all([
        fetch("/api/tasks?limit=200"),
        fetch("/api/missions?limit=100"),
      ]);
      const tasksData = await tasksRes.json();
      const missionsData = await missionsRes.json();
      
      const missionMap: Record<string, { id: string; title: string }> = {};
      (missionsData.missions || []).forEach((m: any) => {
        missionMap[m.id] = { id: m.id, title: m.title };
      });
      setMissions(missionMap);
      
      const enrichedTasks = (tasksData.tasks || []).map((task: Task) => {
        const now = new Date();
        const updated = new Date(task.updated_at);
        const daysStuck = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
        return { ...task, stuck_duration: daysStuck };
      });
      setTasks(enrichedTasks);
    } catch (error) { console.error("Failed:", error); }
    finally { setLoading(false); }
  };

  const getChildTasks = (parentId: string | null) => tasks.filter(t => t.parent_id === parentId);
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const tasksByStatus = tasks.reduce((acc: any, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations"><button className="hover:bg-[#1F2226] p-2 rounded"><ArrowLeft className="w-5 h-5" /></button></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Task Operations</h1>
            <p className="text-[#9BA3AF] text-sm">Unified task management within Operations</p>
          </div>
        </div>
        <button className="bg-[#FF6A00] px-4 py-2 rounded-lg text-white"><Plus className="w-4 h-4 inline mr-2" />New Task</button>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Total", value: tasks.length },
          { label: "Inbox", value: tasksByStatus.inbox || 0 },
          { label: "Active", value: tasksByStatus.in_progress || 0, color: "text-[#FFB020]" },
          { label: "Blocked", value: tasksByStatus.blocked || 0, color: "text-red-500" },
          { label: "Completed", value: tasksByStatus.completed || 0, color: "text-green-500" },
          { label: "Root", value: tasks.filter(t => !t.parent_id).length },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <p className="text-[#9BA3AF] text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color || "text-white"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-[#1F2226]">
        {[
          { id: "list", icon: List, label: "Task Queue" },
          { id: "graph", icon: GitBranch, label: "Hierarchy Graph" },
          { id: "stats", icon: BarChart3, label: "Analytics" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setViewMode(tab.id as any)} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === tab.id ? "border-[#FF6A00] text-white" : "border-transparent text-[#9BA3AF] hover:text-white"
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "list" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#9BA3AF]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." className="bg-[#1F2226] border border-[#2A2D32] text-white px-3 py-2 rounded-lg max-w-md" />
          </div>
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0B0B0C]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase">Task</th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-28">Status</th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-24">Owner</th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-20">Priority</th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-32">Mission</th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#6B7280] uppercase w-24">Stuck Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2226]">
                {filteredTasks.slice(0, 50).map(task => (
                  <tr key={task.id} className="hover:bg-[#0B0B0C]/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {task.status === 'blocked' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        <Link href={`/operations/tasks/${task.id}`} className="text-xs text-white hover:text-[#9BA3AF]">{task.title}</Link>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${task.status === 'completed' ? 'bg-green-500/20 text-green-500' : task.status === 'blocked' ? 'bg-red-500/20 text-red-500' : task.status === 'in_progress' ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#9BA3AF]/20 text-[#9BA3AF]'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] text-[#9BA3AF]">{task.assigned_agent?.display_name || task.agent_id || 'Unassigned'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-[#9BA3AF]">{task.priority || 'medium'}</td>
                    <td className="px-4 py-2.5">
                      {task.mission_id && missions[task.mission_id] ? (
                        <Link href={`/operations/missions/${task.mission_id}`} className="text-[10px] text-[#FF6A00] hover:underline truncate block max-w-[100px]">
                          {missions[task.mission_id].title.slice(0, 20)}...
                        </Link>
                      ) : task.mission ? (
                        <Link href={`/operations/missions/${task.mission.id}`} className="text-[10px] text-[#FF6A00] hover:underline truncate block max-w-[100px]">
                          {task.mission.title.slice(0, 20)}...
                        </Link>
                      ) : (
                        <span className="text-[10px] text-[#6B7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {task.status === 'blocked' && (
                        <span className="text-[10px] font-medium text-red-400">
                          {task.stuck_duration ? `${task.stuck_duration}d` : 'Blocked'}
                        </span>
                      )}
                      {task.status === 'in_progress' && task.stuck_duration && task.stuck_duration > 3 && (
                        <span className="text-[10px] font-medium text-[#FFB020]">
                          {task.stuck_duration}d
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "graph" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg">
            <div className="p-4 border-b border-[#1F2226]">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#9BA3AF]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..." className="bg-[#1F2226] border border-[#2A2D32] text-white px-3 py-2 rounded-lg flex-1 text-sm" />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-2">
              {loading ? <div className="p-4 text-center text-[#9BA3AF]">Loading...</div> : 
               tasks.filter(t => !t.parent_id).length === 0 ? <div className="p-4 text-center text-[#9BA3AF]">No tasks</div> :
               tasks.filter(t => !t.parent_id).map(task => (
                 <div key={task.id} className="flex items-center gap-2 py-2 px-3 hover:bg-[#1F2226] rounded">
                   <Circle className="w-4 h-4 text-[#9BA3AF]" />
                   <span className="text-sm text-white truncate">{task.title}</span>
                 </div>
               ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">Visual Task Graph</h3>
            <TaskGraphVisualization tasks={tasks} />
          </div>
        </div>
      )}

      {viewMode === "stats" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">Status Distribution</h3>
            <div className="space-y-2">
              {Object.entries(tasksByStatus).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-[#9BA3AF]">{status}</span>
                  <span className="text-sm text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">Task Overview</h3>
            <p className="text-[#9BA3AF] text-sm">Total tasks: {tasks.length}</p>
            <p className="text-[#9BA3AF] text-sm">With parent: {tasks.filter(t => t.parent_id).length}</p>
            <p className="text-[#9BA3AF] text-sm">Root level: {tasks.filter(t => !t.parent_id).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
