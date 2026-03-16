'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, CheckSquare, LayoutDashboard, Users, TrendingUp, Flag, Building2, AlertCircle, RefreshCw, Radio, Plus, Filter } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  status: 'active' | 'pending' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string | null;
  company: string | null;
  parentTask: string | null;
  dueDate: string | null;
  progress: number;
}

export default function TacticalTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical/tasks', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setDataSource('live');
      } else {
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[TacticalTasks] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: '/tactical', label: 'Overview', icon: LayoutDashboard },
    { href: '/tactical/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/tactical/delegation', label: 'Delegation', icon: Users },
    { href: '/tactical/productivity', label: 'Productivity', icon: TrendingUp },
    { href: '/tactical/milestones', label: 'Milestones', icon: Flag },
    { href: '/tactical/companies', label: 'Companies', icon: Building2 },
  ];

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Tactical Ops</h1>
              <p className="text-[10px] text-[#6B7280]">Real-time Execution Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/tactical/tasks';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isActive ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Task Center</h1>
              <p className="text-sm text-[#6B7280]">Active task management and tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button disabled className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] border border-[#1F2226] rounded-lg text-xs text-[#6B7280] cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" />New Task
            </button>
            <button onClick={fetchTasks} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <CheckSquare className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Task Backend Not Available</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The task management API is not yet connected. Active task tracking will appear once the backend is deployed.
            </p>
            <button onClick={fetchTasks} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              {(['all', 'active', 'pending', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                    filter === f ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30' : 'text-[#6B7280] hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
                <CheckSquare className="w-8 h-8 text-[#6B7280] mb-4" />
                <p className="text-sm text-[#9BA3AF]">No tasks found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const statusColors = {
    active: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    pending: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30',
    completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
    blocked: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#111214] border border-[#1F2226] rounded-lg hover:border-[#6B7280]/30 transition-colors">
      <div className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[task.status]}`}>{task.status}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
          {task.assignee && <span>@{task.assignee}</span>}
          {task.company && <span>• {task.company}</span>}
          {task.parentTask && <span>• parent: {task.parentTask}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
          <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
        <span className="text-xs text-[#6B7280] w-8 text-right">{task.progress}%</span>
      </div>
    </div>
  );
}
