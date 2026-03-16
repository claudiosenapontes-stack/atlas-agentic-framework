/**
 * ATLAS-OPTIMUS-AUTONOMY-ORCHESTRATION-SERVICE
 * Backend foundation for durable orchestration
 * 
 * Enables Henry to:
 * - Create parent tasks
 * - Spawn child tasks
 * - Assign agents
 * - Track acceptance
 * - Track completion
 * - Aggregate results
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

// Types
export interface TaskOrchestrationConfig {
  parentTaskId?: string;
  orchestrationId?: string;
  expectedChildren?: number;
  autoAggregate?: boolean;
  initiatedBy?: string;
}

export interface ChildTaskSpawnConfig {
  title: string;
  description?: string;
  taskType: string;
  assignedAgentId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  dueAt?: string;
}

export interface TaskAcceptanceResult {
  success: boolean;
  taskId: string;
  agentId: string;
  acceptedAt: string;
  error?: string;
}

export interface TaskResultSubmission {
  resultType: 'output' | 'artifact' | 'decision' | 'error';
  resultData: Record<string, any>;
  resultSummary?: string;
  tokensUsed?: number;
  executionTimeMs?: number;
}

export interface AggregationResult {
  success: boolean;
  parentTaskId: string;
  totalChildren: number;
  completedChildren: number;
  aggregatedResults: Record<string, any>;
  error?: string;
}

/**
 * AutonomyOrchestrationService
 * Core service for parent-child task orchestration
 */
export class AutonomyOrchestrationService {
  private _supabase: any = null;

  private get supabase() {
    if (!this._supabase) {
      this._supabase = getSupabaseAdmin();
    }
    return this._supabase;
  }

  /**
   * Create a parent task that will orchestrate child tasks
   */
  async createParentTask(
    title: string,
    description: string,
    config: TaskOrchestrationConfig = {}
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const orchestrationId = config.orchestrationId || `orch-${randomUUID()}`;
      
      const { data: task, error } = await this.supabase
        .from('tasks')
        .insert({
          title,
          description,
          status: 'pending',
          task_type: 'orchestration',
          orchestration_id: orchestrationId,
          expected_children: config.expectedChildren || 0,
          completed_children: 0,
          parent_task_id: config.parentTaskId || null,
          metadata: {
            orchestration_type: 'parent',
            auto_aggregate: config.autoAggregate !== false,
            initiated_by: config.initiatedBy || 'system',
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, taskId: task.id };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Create parent task error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Spawn a child task under a parent
   */
  async spawnChildTask(
    parentTaskId: string,
    config: ChildTaskSpawnConfig
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      // Get parent task details
      const { data: parent, error: parentError } = await this.supabase
        .from('tasks')
        .select('orchestration_id, company_id, id')
        .eq('id', parentTaskId)
        .single();

      if (parentError || !parent) {
        return { success: false, error: 'Parent task not found' };
      }

      const { data: task, error } = await this.supabase
        .from('tasks')
        .insert({
          title: config.title,
          description: config.description || `Child task of ${parentTaskId}`,
          status: 'pending',
          task_type: config.taskType,
          assigned_agent_id: config.assignedAgentId,
          priority: config.priority || 'medium',
          parent_task_id: parentTaskId,
          orchestration_id: parent.orchestration_id,
          company_id: parent.company_id,
          due_at: config.dueAt || null,
          metadata: {
            ...config.metadata,
            orchestration_type: 'child',
            parent_task_id: parentTaskId,
            spawned_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Update parent's expected children count
      await this.supabase
        .from('tasks')
        .update({
          expected_children: this.supabase.rpc('increment', { x: 1 })
        })
        .eq('id', parentTaskId);

      return { success: true, taskId: task.id };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Spawn child task error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record agent acceptance of a task
   */
  async acceptTask(
    taskId: string,
    agentId: string,
    notes?: string,
    acceptanceType: string = 'assignment'
  ): Promise<TaskAcceptanceResult> {
    try {
      const now = new Date().toISOString();

      // Create acceptance record
      const { error: acceptError } = await this.supabase
        .from('task_acceptances')
        .insert({
          task_id: taskId,
          agent_id: agentId,
          accepted_at: now,
          acceptance_type: acceptanceType,
          notes: notes || null
        });

      if (acceptError) throw acceptError;

      // Update task with acceptance info
      const { error: updateError } = await this.supabase
        .from('tasks')
        .update({
          accepted_by_agent_id: agentId,
          accepted_at: now,
          acceptance_notes: notes || null,
          status: 'in_progress',
          updated_at: now
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      return {
        success: true,
        taskId,
        agentId,
        acceptedAt: now
      };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Accept task error:', error);
      return {
        success: false,
        taskId,
        agentId,
        acceptedAt: '',
        error: error.message
      };
    }
  }

  /**
   * Submit result for a task
   */
  async submitTaskResult(
    taskId: string,
    agentId: string,
    result: TaskResultSubmission
  ): Promise<{ success: boolean; resultId?: string; error?: string }> {
    try {
      // Create result record
      const { data: resultRecord, error: resultError } = await this.supabase
        .from('task_results')
        .insert({
          task_id: taskId,
          agent_id: agentId,
          result_type: result.resultType,
          result_data: result.resultData,
          result_summary: result.resultSummary || null,
          tokens_used: result.tokensUsed || null,
          execution_time_ms: result.executionTimeMs || null
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // Update task with result
      const { error: updateError } = await this.supabase
        .from('tasks')
        .update({
          result_payload: result.resultData,
          result_summary: result.resultSummary || null,
          status: result.resultType === 'error' ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      return { success: true, resultId: resultRecord.id };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Submit result error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get task with all child tasks and results
   */
  async getTaskHierarchy(
    taskId: string
  ): Promise<{ 
    success: boolean; 
    task?: any; 
    children?: any[]; 
    acceptances?: any[];
    results?: any[];
    error?: string;
  }> {
    try {
      // Get parent task
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Get child tasks
      const { data: children } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('created_at', { ascending: true });

      // Get acceptances
      const { data: acceptances } = await this.supabase
        .from('task_acceptances')
        .select('*')
        .eq('task_id', taskId)
        .order('accepted_at', { ascending: false });

      // Get results
      const { data: results } = await this.supabase
        .from('task_results')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      return {
        success: true,
        task,
        children: children || [],
        acceptances: acceptances || [],
        results: results || []
      };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Get hierarchy error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Aggregate results from all child tasks
   */
  async aggregateChildResults(parentTaskId: string): Promise<AggregationResult> {
    try {
      // Get all children with results
      const { data: children, error } = await this.supabase
        .from('tasks')
        .select('*, task_results(*)')
        .eq('parent_task_id', parentTaskId);

      if (error) throw error;

      const totalChildren = children?.length || 0;
      const completedChildren = children?.filter((c: any) => c.status === 'completed').length || 0;

      // Aggregate results
      const aggregatedResults: Record<string, any> = {
        children_count: totalChildren,
        completed_count: completedChildren,
        failed_count: children?.filter((c: any) => c.status === 'failed').length || 0,
        pending_count: children?.filter((c: any) => c.status === 'pending' || c.status === 'in_progress').length || 0,
        results_by_child: {}
      };

      for (const child of children || []) {
        aggregatedResults.results_by_child[child.id] = {
          title: child.title,
          status: child.status,
          assigned_agent: child.assigned_agent_id,
          result_summary: child.result_summary,
          result_data: child.result_payload,
          completed_at: child.completed_at
        };
      }

      // Update parent with aggregated results
      await this.supabase
        .from('tasks')
        .update({
          result_payload: aggregatedResults,
          result_summary: `Aggregated ${completedChildren}/${totalChildren} child tasks`,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', parentTaskId);

      return {
        success: true,
        parentTaskId,
        totalChildren,
        completedChildren,
        aggregatedResults
      };
    } catch (error: any) {
      console.error('[AutonomyOrchestration] Aggregate results error:', error);
      return {
        success: false,
        parentTaskId,
        totalChildren: 0,
        completedChildren: 0,
        aggregatedResults: {},
        error: error.message
      };
    }
  }

  /**
   * Get tasks pending acceptance for an agent
   */
  async getPendingAcceptances(agentId: string): Promise<{ success: boolean; tasks?: any[]; error?: string }> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('assigned_agent_id', agentId)
        .is('accepted_by_agent_id', null)
        .in('status', ['pending', 'inbox'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, tasks: tasks || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get orchestration status
   */
  async getOrchestrationStatus(orchestrationId: string): Promise<{
    success: boolean;
    status?: {
      orchestration_id: string;
      total_tasks: number;
      completed: number;
      failed: number;
      in_progress: number;
      pending: number;
      ready_for_aggregation: number;
    };
    error?: string;
  }> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('status')
        .eq('orchestration_id', orchestrationId);

      if (error) throw error;

      const status = {
        orchestration_id: orchestrationId,
        total_tasks: tasks?.length || 0,
        completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
        failed: tasks?.filter((t: any) => t.status === 'failed').length || 0,
        in_progress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
        pending: tasks?.filter((t: any) => t.status === 'pending' || t.status === 'inbox').length || 0,
        ready_for_aggregation: tasks?.filter((t: any) => t.status === 'ready_for_aggregation').length || 0
      };

      return { success: true, status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a checkpoint for rollback
   */
  async createCheckpoint(taskId: string): Promise<{ success: boolean; checkpointNumber?: number; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_task_checkpoint', { p_task_id: taskId });

      if (error) throw error;

      return {
        success: data.success,
        checkpointNumber: data.checkpoint_number,
        error: data.error
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback task to previous checkpoint
   */
  async rollbackTask(
    taskId: string,
    checkpointNumber?: number,
    reason?: string
  ): Promise<{ success: boolean; restoredToCheckpoint?: number; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .rpc('rollback_task', {
          p_task_id: taskId,
          p_checkpoint_number: checkpointNumber || null,
          p_reason: reason || null
        });

      if (error) throw error;

      return {
        success: data.success,
        restoredToCheckpoint: data.restored_to_checkpoint,
        error: data.error
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add dependency between tasks
   */
  async addDependency(
    taskId: string,
    dependsOnTaskId: string,
    dependencyType: string = 'finish_to_start',
    isBlocking: boolean = true
  ): Promise<{ success: boolean; dependencyId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('task_dependencies')
        .insert({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          dependency_type: dependencyType,
          is_blocking: isBlocking
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, dependencyId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tasks with unmet dependencies
   */
  async getBlockedTasks(parentTaskId: string): Promise<{ success: boolean; blockedTasks?: any[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_tasks_with_unmet_dependencies', { p_parent_id: parentTaskId });

      if (error) throw error;

      return { success: true, blockedTasks: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List child tasks with ordering
   */
  async listChildren(
    parentTaskId: string,
    orderBy: 'created_at' | 'task_order' | 'status' = 'task_order'
  ): Promise<{ success: boolean; children?: any[]; error?: string }> {
    try {
      const { data: children, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          task_dependencies!task_dependencies_task_id_fkey(*),
          dependencies:task_dependencies!task_dependencies_depends_on_task_id_fkey(*)
        `)
        .eq('parent_task_id', parentTaskId)
        .order(orderBy, { ascending: true });

      if (error) throw error;

      return { success: true, children: children || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark child task complete and trigger parent rollup
   */
  async markChildComplete(
    taskId: string,
    agentId: string,
    result: TaskResultSubmission
  ): Promise<{ success: boolean; parentUpdated?: boolean; error?: string }> {
    try {
      // Submit result first
      const resultResponse = await this.submitTaskResult(taskId, agentId, result);
      if (!resultResponse.success) {
        return { success: false, error: resultResponse.error };
      }

      // Get task to find parent
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('parent_task_id')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      return {
        success: true,
        parentUpdated: !!task.parent_task_id
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export const autonomyOrchestrationService = new AutonomyOrchestrationService();