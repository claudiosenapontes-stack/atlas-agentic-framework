'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ============================================
// TASK ACTIONS
// ============================================

export async function getTasks() {
  try {
    // Try with joins first
    let { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        company:companies(id, name),
        assigned_agent:agents!tasks_assigned_agent_id_fkey(id, name, display_name)
      `)
      .order('created_at', { ascending: false })
    
    // If joins fail, fetch without relationships
    if (error) {
      console.log('[getTasks] Falling back to simple query:', error.message)
      const simpleResult = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      
      data = simpleResult.data
      error = simpleResult.error
    }
    
    if (error) {
      console.error('[getTasks] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getTasks] Exception:', err)
    return []
  }
}

export async function getTaskById(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      company:companies(id, name),
      project:projects(id, name),
      assigned_agent:agents!tasks_assigned_agent_id_fkey(id, name, display_name),
      executive_owner:agents!tasks_executive_owner_agent_id_fkey(id, name, display_name),
      operational_owner:agents!tasks_operational_owner_agent_id_fkey(id, name, display_name)
    `)
    .eq('id', id)
    .single()
  
  if (error) return null
  return data
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as string
  const status = formData.get('status') as string
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, description, priority, status })
    .select()
    .single()
  
  if (error) throw error
  revalidatePath('/tasks')
  return data
}

export async function updateTask(id: string, updates: any) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  return data
}

// ============================================
// EXECUTION ACTIONS
// ============================================

export async function getExecutionsByTaskId(taskId: string) {
  const { data, error } = await supabase
    .from('executions')
    .select(`
      *,
      agent:agents(id, name, display_name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createExecution(taskId: string, agentId?: string) {
  const { data, error } = await supabase
    .from('executions')
    .insert({
      task_id: taskId,
      agent_id: agentId,
      status: 'queued'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getTaskChildren(parentId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority')
    .eq('parent_task_id', parentId)
    .order('created_at', { ascending: true })
  
  if (error) return []
  return data || []
}
