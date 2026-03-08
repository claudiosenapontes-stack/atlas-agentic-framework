'use server'

import { supabase } from '@/lib/supabase'

export async function getExecutions(limit: number = 50) {
  const { data, error } = await supabase
    .from('executions')
    .select(`
      *,
      task:tasks(id, title, status),
      agent:agents(id, name, display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export async function getExecutionsByTask(taskId: string) {
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

export async function getExecutionStats() {
  const { count: total } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true })
  
  const { count: succeeded } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'succeeded')
  
  const { count: failed } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
  
  const { count: running } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running')
  
  return {
    total: total || 0,
    succeeded: succeeded || 0,
    failed: failed || 0,
    running: running || 0,
  }
}
