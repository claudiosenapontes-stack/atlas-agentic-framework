'use server'

import { supabase } from '@/lib/supabase'

export async function getExecutions(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('executions')
      .select(`
        *,
        task:tasks(id, title, status),
        agent:agents(id, name, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('[getExecutions] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getExecutions] Exception:', err)
    return []
  }
}

export async function getExecutionsByTask(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('executions')
      .select(`
        *,
        agent:agents(id, name, display_name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[getExecutionsByTask] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getExecutionsByTask] Exception:', err)
    return []
  }
}

export async function getExecutionStats() {
  try {
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
  } catch (err) {
    console.error('[getExecutionStats] Exception:', err)
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      running: 0,
    }
  }
}