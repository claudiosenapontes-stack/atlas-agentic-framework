export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/tasks/tree
// Returns hierarchical task tree for Mission Control visualization
// Supports filtering by root task, company, or agent

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rootTaskId = searchParams.get('rootTaskId');
    const companyId = searchParams.get('companyId') || '29712e4c-a88a-4269-8adb-2802a79087a6';
    const agentId = searchParams.get('agentId');
    const maxDepth = parseInt(searchParams.get('maxDepth') || '5', 10);
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Fetch all relevant tasks (use admin client for unrestricted access)
    const supabaseAdmin = getSupabaseAdmin();
    
    let query = (supabaseAdmin as any)
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        task_type,
        assigned_agent_id,
        parent_task_id,
        command_id,
        task_order,
        created_at
      `)
      .eq('company_id', companyId);

    // Filter by agent if specified
    if (agentId) {
      query = query.eq('assigned_agent_id', agentId);
    }

    // Filter out completed unless requested
    if (!includeCompleted) {
      query = query.not('status', 'in', '(completed,canceled)');
    }

    // Limit results if no specific root
    if (!rootTaskId) {
      query = query.limit(100);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('[Task Tree] Query error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          nodes: [],
          rootIds: [],
          stats: { total: 0, byStatus: {}, byAgent: {} }
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Build task map for O(1) lookup
    const taskMap = new Map<string, any>(tasks.map((t: any) => [t.id, { ...t, children: [] }]));

    // Build tree structure
    const rootIds: string[] = [];
    
    for (const task of tasks) {
      const node = taskMap.get(task.id);
      if (!node) continue;

      // If has parent and parent exists in our set, add as child
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        const parent = taskMap.get(task.parent_task_id);
        parent?.children.push(node);
      } else {
        // This is a root task
        rootIds.push(task.id);
      }
    }

    // If specific root requested, filter to that subtree
    let resultNodes = tasks;
    if (rootTaskId) {
      const subtreeIds = collectSubtreeIds(taskMap, rootTaskId, maxDepth);
      resultNodes = tasks.filter((t: any) => subtreeIds.has(t.id));
    }

    // Calculate depth for each node
    const nodeDepths = new Map<string, number>();
    const calculateDepth = (taskId: string, depth: number, visited: Set<string>) => {
      if (visited.has(taskId) || depth > maxDepth) return;
      visited.add(taskId);
      
      const current = nodeDepths.get(taskId) || 0;
      nodeDepths.set(taskId, Math.max(current, depth));

      const task = taskMap.get(taskId);
      task?.children.forEach((child: any) => {
        calculateDepth(child.id, depth + 1, new Set(visited));
      });
    };

    rootIds.forEach(rootId => calculateDepth(rootId, 0, new Set()));

    // Fetch executions for the relevant tasks (for result visibility)
    const relevantTaskIds = resultNodes.map((t: any) => t.id);
    const { data: executions, error: execError } = await (supabaseAdmin as any)
      .from('executions')
      .select('id, task_id, status, output_preview, error_message, tokens_used, actual_cost_usd, started_at, completed_at')
      .in('task_id', relevantTaskIds)
      .order('created_at', { ascending: false });

    // Build execution map for O(1) lookup
    const executionMap = new Map<string, any>();
    if (executions) {
      for (const exec of executions) {
        // Only store the first (most recent) execution per task
        if (!executionMap.has(exec.task_id)) {
          executionMap.set(exec.task_id, exec);
        }
      }
    }

    // Fetch dependencies for the relevant tasks
    const { data: dependencies } = await (supabaseAdmin as any)
      .from('task_dependencies')
      .select('task_id, depends_on_task_id, dependency_type')
      .in('task_id', relevantTaskIds)
      .in('depends_on_task_id', relevantTaskIds);

    // Build dependency edges
    const dependencyEdges = (dependencies || []).map((dep: any) => ({
      source: dep.depends_on_task_id,
      target: dep.task_id,
      type: dep.dependency_type,
    }));

    // Transform to graph nodes with execution data
    const nodes = resultNodes.map((task: any) => {
      const exec = executionMap.get(task.id);
      return {
        id: task.id,
        label: task.title,
        type: 'task',
        status: task.status,
        priority: task.priority,
        taskType: task.task_type,
        assignedAgent: task.assigned_agent_id,
        parentId: task.parent_task_id,
        commandId: task.command_id,
        order: task.task_order,
        depth: nodeDepths.get(task.id) || 0,
        hasChildren: taskMap.get(task.id)?.children.length > 0,
        createdAt: task.created_at,
        // Execution result visibility for Gate 3
        execution: exec ? {
          id: exec.id,
          status: exec.status,
          outputPreview: exec.output_preview,
          errorMessage: exec.error_message,
          tokensUsed: exec.tokens_used,
          actualCostUsd: exec.actual_cost_usd,
          startedAt: exec.started_at,
          completedAt: exec.completed_at,
        } : null,
      };
    });

    // Build parent-child edges
    const parentChildEdges = resultNodes
      .filter((t: any) => t.parent_task_id && taskMap.has(t.parent_task_id))
      .map((t: any) => ({
        source: t.parent_task_id,
        target: t.id,
        type: 'parent_child',
      }));

    // Calculate stats
    const stats = {
      total: tasks.length,
      filtered: resultNodes.length,
      rootCount: rootIds.length,
      byStatus: tasks.reduce((acc: any, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
      byAgent: tasks.reduce((acc: any, t: any) => {
        const agent = t.assigned_agent_id || 'unassigned';
        acc[agent] = (acc[agent] || 0) + 1;
        return acc;
      }, {}),
      byPriority: tasks.reduce((acc: any, t: any) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {}),
      // Execution stats for visibility
      byExecutionStatus: (() => {
        const execStats: Record<string, number> = {};
        for (const exec of executions || []) {
          execStats[exec.status] = (execStats[exec.status] || 0) + 1;
        }
        return execStats;
      })(),
      totalTokensUsed: (() => {
        return (executions || []).reduce((sum: number, e: any) => sum + (e.tokens_used || 0), 0);
      })(),
      totalCostUsd: (() => {
        return (executions || []).reduce((sum: number, e: any) => sum + (e.actual_cost_usd || 0), 0);
      })(),
    };

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        edges: [...parentChildEdges, ...dependencyEdges],
        rootIds,
        stats,
        filters: {
          companyId,
          agentId,
          rootTaskId,
          maxDepth,
          includeCompleted,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Task Tree] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to collect all IDs in a subtree
function collectSubtreeIds(
  taskMap: Map<string, any>,
  rootId: string,
  maxDepth: number,
  currentDepth = 0,
  visited = new Set<string>()
): Set<string> {
  const result = new Set<string>();
  
  if (visited.has(rootId) || currentDepth > maxDepth) return result;
  visited.add(rootId);
  result.add(rootId);

  const task = taskMap.get(rootId);
  if (task?.children) {
    for (const child of task.children) {
      const childIds = collectSubtreeIds(taskMap, child.id, maxDepth, currentDepth + 1, visited);
      childIds.forEach(id => result.add(id));
    }
  }

  return result;
}
