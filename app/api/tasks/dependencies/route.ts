import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/tasks/dependencies
// Returns task dependency graph for Mission Control visualization

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const companyId = searchParams.get('companyId');
    const depth = parseInt(searchParams.get('depth') || '3', 10);

    // Build query for dependencies
    let query = supabase
      .from('task_dependencies')
      .select(`
        id,
        dependency_type,
        task_id,
        depends_on_task_id,
        created_at,
        task:tasks!task_dependencies_task_id_fkey(id, title, status, priority, assigned_agent_id),
        depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status, priority, assigned_agent_id)
      `);

    // Filter by specific task if provided
    if (taskId) {
      query = query.or(`task_id.eq.${taskId},depends_on_task_id.eq.${taskId}`);
    }

    const { data: dependencies, error } = await query;

    if (error) {
      console.error('[Task Dependencies] Query error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dependencies' },
        { status: 500 }
      );
    }

    // Get all related task IDs from dependencies
    const relatedTaskIds = new Set<string>();
    dependencies?.forEach((dep: any) => {
      relatedTaskIds.add(dep.task_id);
      relatedTaskIds.add(dep.depends_on_task_id);
    });

    // Fetch parent task relationships
    const { data: tasksWithParents } = await supabase
      .from('tasks')
      .select('id, parent_task_id, title, status, priority, assigned_agent_id')
      .in('id', Array.from(relatedTaskIds))
      .or(`parent_task_id.in.${Array.from(relatedTaskIds).join(',')}`);

    // Build graph structure
    const nodes = new Map();
    const edges: any[] = [];

    // Add task nodes
    tasksWithParents?.forEach((task: any) => {
      nodes.set(task.id, {
        id: task.id,
        type: 'task',
        label: task.title,
        status: task.status,
        priority: task.priority,
        assignedAgent: task.assigned_agent_id,
        isParent: !!task.parent_task_id,
      });

      // Add parent-child edge
      if (task.parent_task_id) {
        edges.push({
          id: `parent-${task.parent_task_id}-${task.id}`,
          source: task.parent_task_id,
          target: task.id,
          type: 'parent_child',
          label: 'child of',
        });
      }
    });

    // Add dependency edges
    dependencies?.forEach((dep: any) => {
      edges.push({
        id: dep.id,
        source: dep.depends_on_task_id,
        target: dep.task_id,
        type: dep.dependency_type, // 'blocking' or 'non_blocking'
        label: dep.dependency_type === 'blocking' ? 'blocks' : 'depends on',
      });

      // Ensure both nodes exist
      if (!nodes.has(dep.task_id)) {
        nodes.set(dep.task_id, { id: dep.task_id, type: 'task' });
      }
      if (!nodes.has(dep.depends_on_task_id)) {
        nodes.set(dep.depends_on_task_id, { id: dep.depends_on_task_id, type: 'task' });
      }
    });

    // Calculate depth levels for each node
    const nodeDepths = new Map<string, number>();
    const calculateDepth = (nodeId: string, currentDepth: number, visited: Set<string>) => {
      if (visited.has(nodeId) || currentDepth > depth) return;
      visited.add(nodeId);
      
      const existingDepth = nodeDepths.get(nodeId) || 0;
      nodeDepths.set(nodeId, Math.max(existingDepth, currentDepth));

      // Follow dependency edges (depends_on -> task means task depends on depends_on)
      const outgoingDeps = edges.filter(e => e.source === nodeId && e.type !== 'parent_child');
      outgoingDeps.forEach(edge => {
        calculateDepth(edge.target, currentDepth + 1, new Set(visited));
      });
    };

    // Start from root nodes (no incoming dependencies)
    const allTargetIds = new Set(edges.filter(e => e.type !== 'parent_child').map(e => e.target));
    const rootNodes = Array.from(nodes.keys()).filter(id => !allTargetIds.has(id));
    rootNodes.forEach(rootId => calculateDepth(rootId, 0, new Set()));

    return NextResponse.json({
      success: true,
      data: {
        nodes: Array.from(nodes.values()).map((n: any) => ({
          ...n,
          depth: nodeDepths.get(n.id) || 0,
        })),
        edges,
        stats: {
          totalNodes: nodes.size,
          totalEdges: edges.length,
          blockingDeps: edges.filter((e: any) => e.type === 'blocking').length,
          nonBlockingDeps: edges.filter((e: any) => e.type === 'non_blocking').length,
          parentChild: edges.filter((e: any) => e.type === 'parent_child').length,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Task Dependencies] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/dependencies
// Create a new dependency between tasks

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, dependsOnTaskId, dependencyType = 'blocking' } = body;

    if (!taskId || !dependsOnTaskId) {
      return NextResponse.json(
        { success: false, error: 'taskId and dependsOnTaskId are required' },
        { status: 400 }
      );
    }

    if (taskId === dependsOnTaskId) {
      return NextResponse.json(
        { success: false, error: 'Task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Check for circular dependency
    const { data: existingDeps } = await supabase
      .from('task_dependencies')
      .select('task_id, depends_on_task_id');

    const wouldCreateCycle = checkCircularDependency(
      taskId,
      dependsOnTaskId,
      existingDeps || []
    );

    if (wouldCreateCycle) {
      return NextResponse.json(
        { success: false, error: 'This dependency would create a circular reference' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        dependency_type: dependencyType,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Dependency already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Log event
    await supabase.from('events').insert({
      event_type: 'task.dependency.added',
      actor_type: 'system',
      actor_id: 'api',
      target_type: 'task',
      target_id: taskId,
      payload: {
        depends_on_task_id: dependsOnTaskId,
        dependency_type: dependencyType,
      },
    });

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Task Dependencies] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to detect circular dependencies
function checkCircularDependency(
  newTaskId: string,
  newDependsOnId: string,
  existingDeps: Array<{ task_id: string; depends_on_task_id: string }>
): boolean {
  const graph = new Map<string, Set<string>>();
  
  // Build adjacency list
  existingDeps.forEach(dep => {
    if (!graph.has(dep.depends_on_task_id)) {
      graph.set(dep.depends_on_task_id, new Set());
    }
    graph.get(dep.depends_on_task_id)?.add(dep.task_id);
  });

  // Add the new dependency
  if (!graph.has(newDependsOnId)) {
    graph.set(newDependsOnId, new Set());
  }
  graph.get(newDependsOnId)?.add(newTaskId);

  // DFS to check if newTaskId can reach newDependsOnId (which would create a cycle)
  const visited = new Set<string>();
  const stack = [newTaskId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === newDependsOnId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = graph.get(current);
    if (neighbors) {
      neighbors.forEach(n => stack.push(n));
    }
  }

  return false;
}
