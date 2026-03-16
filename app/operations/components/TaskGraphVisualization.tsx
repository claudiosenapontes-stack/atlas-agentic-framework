"use client";

import { useMemo } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  parent_id: string | null;
  agent_id: string | null;
  created_at: string;
}

interface TaskGraphVisualizationProps {
  tasks: Task[];
}

export function TaskGraphVisualization({ tasks }: TaskGraphVisualizationProps) {
  const { nodes, edges } = useMemo(() => {
    const rootTasks = tasks.filter(t => t.parent_id === null).slice(0, 5);
    const allNodes: Array<{ id: string; title: string; status: string; x: number; y: number }> = [];
    const allEdges: Array<{ from: string; to: string }> = [];
    
    const processTask = (task: Task, depth: number, index: number, parentX: number = 0) => {
      const x = Math.max(50, Math.min(650, parentX + (index * 130) - (depth * 65)));
      const y = depth * 70 + 30;
      
      allNodes.push({
        id: task.id,
        title: task.title.slice(0, 15),
        status: task.status,
        x,
        y,
      });
      
      if (task.parent_id) {
        allEdges.push({ from: task.parent_id, to: task.id });
      }
      
      const children = tasks.filter(t => t.parent_id === task.id).slice(0, 3);
      children.forEach((child, i) => {
        processTask(child, depth + 1, i, x);
      });
    };
    
    rootTasks.forEach((task, i) => {
      processTask(task, 0, i, 350);
    });
    
    return { nodes: allNodes, edges: allEdges };
  }, [tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#22C55E";
      case "in_progress":
        return "#FF6A00";
      case "failed":
        return "#EF4444";
      default:
        return "#9BA3AF";
    }
  };

  if (tasks.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[#9BA3AF]">No tasks to visualize</div>;
  }

  return (
    <div className="h-64 overflow-auto bg-[#0B0B0C] rounded-lg">
      <svg width="700" height="250" className="min-w-full">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#1F2226" />
          </marker>
        </defs>
        
        {edges.map((edge, i) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          
          return (
            <line
              key={i}
              x1={fromNode.x + 50}
              y1={fromNode.y + 20}
              x2={toNode.x + 50}
              y2={toNode.y}
              stroke="#1F2226"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        {nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width="100"
              height="40"
              rx="6"
              fill="#111214"
              stroke={getStatusColor(node.status)}
              strokeWidth="2"
            />
            <text
              x={node.x + 50}
              y={node.y + 16}
              textAnchor="middle"
              fill="#fff"
              fontSize="9"
            >
              {node.title.length > 10 ? node.title.slice(0, 10) + "..." : node.title}
            </text>
            <text
              x={node.x + 50}
              y={node.y + 30}
              textAnchor="middle"
              fill="#9BA3AF"
              fontSize="7"
            >
              {node.status}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
