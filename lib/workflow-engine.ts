/**
 * ATLAS-HOT-LEAD-WORKFLOW-M1-1099
 * Workflow Engine for event-driven execution
 * 
 * Features:
 * - Idempotent execution (idempotency_key deduplication)
 * - Retry-safe with step-level traceability
 * - Company-scoped with owner assignment rules
 */

import { getSupabaseAdmin } from "./supabase-admin";

export interface WorkflowTriggerEvent {
  id: string;
  type: string;
  payload: any;
}

export interface WorkflowConfig {
  workflowName: string;
  companyId: string;
  idempotencyKey: string;
  triggerEvent: WorkflowTriggerEvent;
}

export interface StepResult {
  stepName: string;
  success: boolean;
  output?: any;
  error?: string;
}

export class WorkflowEngine {
  private supabase = getSupabaseAdmin();
  private executionId?: string;
  private workflowConfig?: any;
  
  constructor(private config: WorkflowConfig) {}

  /**
   * Main execution entry point
   * Returns existing result if idempotency_key matches
   */
  async execute(): Promise<{
    success: boolean;
    idempotent?: boolean;
    execution_id?: string;
    status?: string;
    output?: any;
    error?: string;
  }> {
    try {
      // Step 0: Idempotency check
      const existing = await this.checkExisting();
      if (existing) {
        return {
          success: true,
          idempotent: true,
          execution_id: (existing as any).id,
          status: (existing as any).status,
          output: (existing as any).output
        };
      }

      // Step 1: Create execution record
      this.executionId = await this.createExecution();
      if (!this.executionId) {
        throw new Error('Failed to create workflow execution');
      }

      // Load workflow config
      this.workflowConfig = await this.loadWorkflowConfig();
      
      // Step 2: Execute workflow steps
      const results: StepResult[] = [];
      
      // Step 2a: Validate lead
      results.push(await this.runStep('validate_lead', () => this.validateLead()));
      
      // Step 2b: Assign owner
      const assignment = await this.runStep('assign_owner', () => this.assignOwner(this.workflowConfig.config.owner_assignment));
      
      // Step 2c: Create task (exactly once)
      const task = await this.runStep('create_task', () => this.createTask(
        this.workflowConfig.config.task_template, 
        assignment.output?.userId
      ));
      
      // Step 2d: Send notification (exactly once)
      await this.runStep('send_notification', () => this.sendNotification(
        this.workflowConfig.config.notification,
        task.output,
        assignment.output
      ));
      
      // Step 3: Mark complete
      const output = {
        task_id: task.output?.id,
        assigned_user_id: assignment.output?.userId,
        steps_completed: results.length
      };
      
      await this.completeExecution(output);
      
      return { 
        success: true, 
        execution_id: this.executionId, 
        status: 'completed',
        output 
      };
      
    } catch (error) {
      await this.failExecution(error);
      return {
        success: false,
        execution_id: this.executionId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check for existing execution with same idempotency key
   */
  private async checkExisting() {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select('*')
      .eq('idempotency_key', this.config.idempotencyKey)
      .single();
    
    if (error) return null;
    return data;
  }

  /**
   * Create new workflow execution record
   */
  private async createExecution(): Promise<string | null> {
    const workflow = await this.loadWorkflowConfig();
    
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .insert({
        workflow_id: (workflow as any).id,
        company_id: this.config.companyId,
        idempotency_key: this.config.idempotencyKey,
        trigger_event_id: this.config.triggerEvent.id,
        trigger_event_type: this.config.triggerEvent.type,
        trigger_payload: this.config.triggerEvent.payload,
        status: 'running',
        max_attempts: 3
      } as any)
      .select()
      .single();
    
    if (error) {
      console.error('[WorkflowEngine] Failed to create execution:', error);
      return null;
    }
    
    return (data as any)?.id;
  }

  /**
   * Execute a workflow step with traceability
   */
  private async runStep<T>(
    stepName: string, 
    fn: () => Promise<T>
  ): Promise<StepResult> {
    const stepOrder = this.getStepOrder(stepName);
    
    // Record step start
    await this.supabase.from('workflow_step_events').insert({
      workflow_execution_id: this.executionId,
      company_id: this.config.companyId,
      step_name: stepName,
      step_order: stepOrder,
      status: 'started',
      started_at: new Date().toISOString(),
      input_snapshot: this.config.triggerEvent.payload
    } as any);

    try {
      const result = await fn();
      
      // Record step completion
      await this.supabase.from('workflow_step_events').insert({
        workflow_execution_id: this.executionId,
        company_id: this.config.companyId,
        step_name: stepName,
        step_order: stepOrder,
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_snapshot: result
      } as any);
      
      return { stepName, success: true, output: result };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Record step failure
      await this.supabase.from('workflow_step_events').insert({
        workflow_execution_id: this.executionId,
        company_id: this.config.companyId,
        step_name: stepName,
        step_order: stepOrder,
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
        retryable: this.isRetryableError(error)
      } as any);
      
      throw error;
    }
  }

  /**
   * Validate lead data
   */
  private async validateLead(): Promise<{ valid: boolean; lead_id: string }> {
    const lead = this.config.triggerEvent.payload;
    
    if (!lead.lead_id) {
      throw new Error('Missing lead_id in payload');
    }
    
    if (!lead.company_id) {
      throw new Error('Missing company_id in payload');
    }
    
    // Verify lead exists and score is actually hot
    const { data: leadData, error } = await this.supabase
      .from('leads')
      .select('id, score, status')
      .eq('id', lead.lead_id)
      .eq('company_id', lead.company_id)
      .single();
    
    if (error || !leadData) {
      throw new Error(`Lead not found: ${lead.lead_id}`);
    }
    
    if ((leadData as any).score < 80) { // Hot threshold
      throw new Error(`Lead score ${(leadData as any).score} below hot threshold`);
    }
    
    return { valid: true, lead_id: lead.lead_id };
  }

  /**
   * Assign owner using configured strategy
   */
  private async assignOwner(config: any): Promise<{ userId: string | null }> {
    const { strategy, team_role, fallback_user_id } = config;
    
    switch (strategy) {
      case 'round_robin':
        return this.assignRoundRobin(team_role, fallback_user_id);
      case 'load_based':
        return this.assignLoadBased(team_role, fallback_user_id);
      case 'fixed':
        return { userId: fallback_user_id };
      default:
        return { userId: fallback_user_id };
    }
  }

  /**
   * Round-robin assignment across team
   */
  private async assignRoundRobin(
    teamRole: string, 
    fallbackUserId: string | null
  ): Promise<{ userId: string | null }> {
    // Get last assignment for this company
    const { data: lastAssignments } = await this.supabase
      .from('workflow_executions')
      .select('output->assigned_user_id, created_at')
      .eq('company_id', this.config.companyId)
      .eq('trigger_event_type', 'lead_scored_hot')
      .not('output->assigned_user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const lastUserId = (lastAssignments as any)?.[0]?.output?.assigned_user_id;
    
    // Get team members with role
    const { data: team } = await this.supabase
      .from('company_users')
      .select('user_id')
      .eq('company_id', this.config.companyId)
      .eq('role', teamRole)
      .eq('is_active', true);
    
    if (!team || team.length === 0) {
      console.warn(`[WorkflowEngine] No ${teamRole} found for company ${this.config.companyId}`);
      return { userId: fallbackUserId };
    }
    
    // Find next in rotation
    const userIds = (team as any[]).map(t => t.user_id);
    const lastIndex = lastUserId ? userIds.indexOf(lastUserId) : -1;
    const nextIndex = (lastIndex + 1) % userIds.length;
    
    return { userId: userIds[nextIndex] };
  }

  /**
   * Load-based assignment (assign to user with fewest open tasks)
   */
  private async assignLoadBased(
    teamRole: string,
    fallbackUserId: string | null
  ): Promise<{ userId: string | null }> {
    // Get team members
    const { data: team } = await this.supabase
      .from('company_users')
      .select('user_id')
      .eq('company_id', this.config.companyId)
      .eq('role', teamRole)
      .eq('is_active', true);
    
    if (!team || team.length === 0) {
      return { userId: fallbackUserId };
    }
    
    const userIds = (team as any[]).map(t => t.user_id);

    // Count open tasks per user
    // @ts-ignore
    const { data: taskCounts } = await this.supabase
      .from('tasks')
      .select('assignee_id, count(*)')
      .in('assignee_id', userIds)
      .eq('status', 'inbox')
      // @ts-ignore
      .group('assignee_id');

    // Find user with lowest load
    const loadMap = new Map((taskCounts as any[])?.map(t => [t.assignee_id, parseInt(t.count)]) || []);
    let minLoad = Infinity;
    let selectedUser = fallbackUserId;
    
    for (const userId of userIds) {
      const load = loadMap.get(userId) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedUser = userId;
      }
    }
    
    return { userId: selectedUser };
  }

  /**
   * Create follow-up task (exactly once per execution)
   */
  private async createTask(
    template: any, 
    assignedUserId: string | null
  ): Promise<any> {
    const lead = this.config.triggerEvent.payload;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (template.due_hours || 4));
    
    const { data: task, error } = await this.supabase
      .from('tasks')
      .insert({
        company_id: this.config.companyId,
        title: template.title.replace('{{lead_name}}', lead.lead_name || lead.lead_email || 'Unknown Lead'),
        description: `Hot lead scored ${lead.score || 'high'}. Follow up within ${template.due_hours || 4} hours.\n\nLead ID: ${lead.lead_id}`,
        priority: template.priority || 'high',
        assignee_id: assignedUserId,
        due_at: dueDate.toISOString(),
        status: 'inbox',
        source: 'workflow_hot_lead',
        source_id: this.executionId,
        metadata: {
          lead_id: lead.lead_id,
          lead_email: lead.lead_email,
          lead_score: lead.score,
          workflow_execution_id: this.executionId,
          triggered_at: lead.scored_at
        }
      } as any)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
    
    return task;
  }

  /**
   * Send notification to assigned user (exactly once per execution)
   */
  private async sendNotification(
    config: any,
    task: any,
    assignment: any
  ): Promise<{ sent: boolean; channels: string[] }> {
    if (!assignment?.userId) {
      return { sent: false, channels: [] };
    }
    
    const lead = this.config.triggerEvent.payload;
    const notifications = [];
    
    for (const channel of config.channels || ['in_app']) {
      notifications.push(
        this.supabase.from('notifications').insert({
          company_id: this.config.companyId,
          user_id: assignment.userId,
          type: channel,
          title: '🔥 Hot Lead Assigned',
          body: `New hot lead (${lead.score} score): ${lead.lead_name || lead.lead_email}. Task: ${task?.title}`,
          metadata: {
            task_id: task?.id,
            lead_id: lead.lead_id,
            workflow_execution_id: this.executionId,
            channel: channel
          },
          read: false,
          created_at: new Date().toISOString()
        } as any)
      );
    }
    
    await Promise.all(notifications);
    
    return { sent: true, channels: config.channels || ['in_app'] };
  }

  /**
   * Mark execution as completed
   */
  private async completeExecution(output: any): Promise<void> {
    await (this.supabase as any)
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output
      })
      .eq('id', this.executionId);
  }

  /**
   * Mark execution as failed
   */
  private async failExecution(error: any): Promise<void> {
    if (!this.executionId) return;

    await (this.supabase as any)
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error)
      })
      .eq('id', this.executionId);
  }

  /**
   * Load workflow definition and config
   */
  private async loadWorkflowConfig() {
    const { data, error } = await this.supabase
      .from('workflow_definitions')
      .select('*')
      .eq('name', this.config.workflowName)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      throw new Error(`Workflow '${this.config.workflowName}' not found or inactive`);
    }

    return data as any;
  }

  /**
   * Get step order for traceability
   */
  private getStepOrder(stepName: string): number {
    const orders: Record<string, number> = {
      'validate_lead': 1,
      'assign_owner': 2,
      'create_task': 3,
      'send_notification': 4
    };
    return orders[stepName] || 99;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const message = String(error);
    const retryablePatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporarily/i,
      /rate.*limit/i,
      /service.*unavailable/i
    ];
    return retryablePatterns.some(p => p.test(message));
  }
}
