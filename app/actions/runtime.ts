'use server'

import { supabase } from '@/lib/supabase'
import { getRedisClient, LockKeys, acquireLock } from '@/lib/redis'

// ============================================
// TASK CLAIM SYSTEM
// ============================================

export interface TaskClaimResult {
  success: boolean
  task?: any
  execution?: any
  error?: string
}

export async function claimTask(agentId: string, agentName: string): Promise<TaskClaimResult> {
  const queueName = `queue:tasks:${agentName}`
  const redis = getRedisClient()
  
  // Get highest priority task from queue
  const items = await redis.zpopmin(queueName, 1)
  if (!items || items.length === 0) {
    return { success: false, error: 'No tasks in queue' }
  }
  
  const taskData = JSON.parse(items[0])
  const taskId = taskData.task_id
  
  // Acquire lock to prevent double-claiming
  const lock = await acquireLock(LockKeys.task(taskId), 60)
  if (!lock) {
    return { success: false, error: 'Task already claimed' }
  }
  
  try {
    // Update task status
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        assigned_agent_id: agentId,
        started_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single()
    
    if (taskError) throw taskError
    
    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('executions')
      .insert({
        task_id: taskId,
        agent_id: agentId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (execError) throw execError
    
    // Publish event
    await redis.publish('event:execution.started', JSON.stringify({
      task_id: taskId,
      execution_id: execution.id,
      agent_id: agentId,
    }))
    
    return { success: true, task, execution }
  } catch (error: any) {
    return { success: false, error: error.message }
  } finally {
    await lock.release()
  }
}

// ============================================
// EXECUTION REPORTING
// ============================================

export async function reportExecutionProgress(
  executionId: string,
  updates: {
    step?: string
    progress?: number
    result_summary?: string
    error_summary?: string
  }
) {
  const { error } = await supabase
    .from('executions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', executionId)
  
  if (error) throw error
}

export async function completeExecution(
  executionId: string,
  taskId: string,
  result: {
    status: 'succeeded' | 'failed' | 'escalated'
    summary?: string
    error?: string
  }
) {
  const redis = getRedisClient()
  
  // Update execution
  const { error: execError } = await supabase
    .from('executions')
    .update({
      status: result.status,
      result_summary: result.summary,
      error_summary: result.error,
      ended_at: new Date().toISOString(),
    })
    .eq('id', executionId)
  
  if (execError) throw execError
  
  // Update task
  const taskUpdate: any = {
    status: result.status === 'succeeded' ? 'completed' : result.status === 'escalated' ? 'blocked' : 'in_progress',
  }
  
  if (result.status === 'succeeded') {
    taskUpdate.completed_at = new Date().toISOString()
    taskUpdate.progress = 100
  }
  
  const { error: taskError } = await supabase
    .from('tasks')
    .update(taskUpdate)
    .eq('id', taskId)
  
  if (taskError) throw taskError
  
  // Publish event
  await redis.publish(`event:execution.${result.status}`, JSON.stringify({
    task_id: taskId,
    execution_id: executionId,
  }))
}

// ============================================
// QUEUE STATUS
// ============================================

export async function getAllQueueDepths() {
  const redis = getRedisClient()
  const agents = ['henry', 'olivia', 'harvey', 'sophia', 'einstein', 'optimus', 'prime', 'severino']
  
  const depths: Record<string, number> = {}
  
  for (const agent of agents) {
    const depth = await redis.zcard(`queue:tasks:${agent}`)
    depths[agent] = depth
  }
  
  return depths
}
