import { supabase } from '@/lib/supabase'

// ============================================
// ACL (Agent Command Language) Processor
// ============================================

export interface ACLCommand {
  type: string
  agent: string
  company?: string
  task_id?: string
  payload: Record<string, any>
  timestamp: string
}

export const ACL_COMMAND_TYPES = [
  'task.create',
  'task.delegate',
  'task.update',
  'task.complete',
  'approval.request',
  'approval.response',
  'execution.report',
  'incident.report',
  'document.created',
  'communication.summary',
  'handoff.created',
  'health.report',
] as const

export async function processACLCommand(command: ACLCommand) {
  console.log(`[ACL] Processing ${command.type} from ${command.agent}`)

  switch (command.type) {
    case 'task.create':
      return await handleTaskCreate(command)
    case 'task.delegate':
      return await handleTaskDelegate(command)
    case 'task.update':
      return await handleTaskUpdate(command)
    case 'task.complete':
      return await handleTaskComplete(command)
    case 'approval.request':
      return await handleApprovalRequest(command)
    case 'approval.response':
      return await handleApprovalResponse(command)
    case 'execution.report':
      return await handleExecutionReport(command)
    case 'incident.report':
      return await handleIncidentReport(command)
    default:
      throw new Error(`Unknown ACL command type: ${command.type}`)
  }
}

async function handleTaskCreate(command: ACLCommand) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: command.payload.title,
      description: command.payload.description,
      company_id: command.company,
      priority: command.payload.priority || 'medium',
      status: 'inbox',
      created_by_agent_id: command.payload.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function handleTaskDelegate(command: ACLCommand) {
  const { error } = await supabase
    .from('tasks')
    .update({
      assigned_agent_id: command.payload.assigned_to,
      status: 'assigned',
    })
    .eq('id', command.task_id)

  if (error) throw error
  return { success: true }
}

async function handleTaskUpdate(command: ACLCommand) {
  const { error } = await supabase
    .from('tasks')
    .update(command.payload.updates)
    .eq('id', command.task_id)

  if (error) throw error
  return { success: true }
}

async function handleTaskComplete(command: ACLCommand) {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress: 100,
    })
    .eq('id', command.task_id)

  if (error) throw error
  return { success: true }
}

async function handleApprovalRequest(command: ACLCommand) {
  const { data, error } = await supabase
    .from('approvals')
    .insert({
      task_id: command.task_id,
      requested_by_agent_id: command.agent,
      action_type: command.payload.action_type,
      approver_type: command.payload.approver_type,
      status: 'pending',
      payload: command.payload,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function handleApprovalResponse(command: ACLCommand) {
  const { error } = await supabase
    .from('approvals')
    .update({
      status: command.payload.decision,
      decision_note: command.payload.note,
      [command.payload.decision === 'approved' ? 'approved_at' : 'rejected_at']: new Date().toISOString(),
    })
    .eq('id', command.payload.approval_id)

  if (error) throw error
  return { success: true }
}

async function handleExecutionReport(command: ACLCommand) {
  const { data, error } = await supabase
    .from('executions')
    .insert({
      task_id: command.task_id,
      agent_id: command.agent,
      status: command.payload.status,
      result_summary: command.payload.result,
      error_summary: command.payload.error,
      worker_pid: command.payload.worker_pid,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function handleIncidentReport(command: ACLCommand) {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      company_id: command.company,
      task_id: command.task_id,
      reported_by_agent_id: command.agent,
      severity: command.payload.severity,
      summary: command.payload.summary,
      status: 'open',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
