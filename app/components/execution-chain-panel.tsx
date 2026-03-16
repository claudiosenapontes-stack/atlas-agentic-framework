'use client';

import { useState, useEffect } from 'react';
import { GitBranch, ChevronRight, Circle, CheckCircle, XCircle, Play, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ExecutionNode {
  id: string;
  type: 'parent' | 'child' | 'sibling';
  title: string;
  status: string;
  agentId: string | null;
  depth: number;
}

interface ExecutionChainPanelProps {
  taskId: string;
  refreshInterval?: number;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  inbox: <Circle className="w-3 h-3" />,
  draft: <Circle className="w-3 h-3" />,
  pending_approval: <Clock className="w-3 h-3" />,
  claimed: <Play className="w-3 h-3" />,
  in_progress: <Loader2 className="w-3 h-3 animate-spin" />,
  blocked: <XCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
  claimed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

export function ExecutionChainPanel({ taskId, refreshInterval = 5000 }: ExecutionChainPanelProps) {
  const [chain, setChain] = useState<ExecutionNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChain = async () => {
    try {
      // Fetch task details to get parent
      const taskRes = await fetch(`/api/tasks`);
      if (!taskRes.ok) throw new Error('Failed to fetch task chain');
      
      const data = await taskRes.json();
      const tasks = data.tasks || [];
      
      // Build chain manually until API supports tree endpoint
      const currentTask = tasks.find((t: any) => t.id === taskId);
      if (!currentTask) {
        setChain([]);
        setIsLoading(false);
        return;
      }

      const nodes: ExecutionNode[] = [];
      
      // Add parent if exists
      if (currentTask.parent_task_id) {
        const parent = tasks.find((t: any) => t.id === currentTask.parent_task_id);
        if (parent) {
          nodes.push({
            id: parent.id,
            type: 'parent',
            title: parent.title,
            status: parent.status,
            agentId: parent.assigned_agent_id,
            depth: 0,
          });
        }
      }
      
      // Add current task
      nodes.push({
        id: currentTask.id,
        type: currentTask.parent_task_id ? 'child' : 'parent',
        title: currentTask.title,
        status: currentTask.status,
        agentId: currentTask.assigned_agent_id,
        depth: currentTask.parent_task_id ? 1 : 0,
      });
      
      // Add children
      const children = tasks.filter((t: any) => t.parent_task_id === taskId);
      children.forEach((child: any) => {
        nodes.push({
          id: child.id,
          type: 'child',
          title: child.title,
          status: child.status,
          agentId: child.assigned_agent_id,
          depth: currentTask.parent_task_id ? 2 : 1,
        });
      });

      setChain(nodes);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChain();
    const interval = setInterval(fetchChain, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, taskId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading execution chain...</span>
        </div>
      </div>
    );
  }

  if (chain.length <= 1) {
    return null; // No chain to show
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-600" />
          <span className="font-medium text-slate-800">Execution Chain</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {chain.length} tasks
          </span>
        </div>
      </div>

      {error ? (
        <div className="p-4 text-red-600 text-sm">Error: {error}</div>
      ) : (
        <div className="p-4 space-y-2">
          {chain.map((node, index) => (
            <div key={node.id} className="flex items-center gap-3">
              {/* Indentation */}
              <div 
                className="w-4 flex items-center justify-center"
                style={{ marginLeft: `${node.depth * 16}px` }}
              >
                {index > 0 && <div className="w-px h-full bg-slate-200 absolute" />}
              </div>
              
              {/* Connector line */}
              {node.depth > 0 && (
                <div className="flex items-center">
                  <div className="w-4 h-px bg-slate-300" />
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </div>
              )}
              
              {/* Node */}
              <Link
                href={`/operations/tasks/${node.id}`}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  node.id === taskId 
                    ? 'bg-violet-50 border-violet-200' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1 rounded ${STATUS_COLORS[node.status]}`}>
                  {STATUS_ICONS[node.status] || STATUS_ICONS.inbox}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    node.id === taskId ? 'text-violet-900' : 'text-slate-700'
                  }`}>
                    {node.title}
                  </p>
                  {node.agentId && (
                    <span className="text-xs text-slate-500">
                      {node.agentId}
                    </span>
                  )}
                </div>
                
                {node.id === taskId && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                    Current
                  </span>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
