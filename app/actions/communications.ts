'use server'

import { supabase } from '@/lib/supabase'

export async function getCommunications(limit: number = 50) {
  const { data, error } = await supabase
    .from('communications')
    .select(`
      *,
      task:tasks(id, title),
      agent:agents(id, name, display_name),
      company:companies(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export async function getCommunicationsByTask(taskId: string) {
  const { data, error } = await supabase
    .from('communications')
    .select(`
      *,
      agent:agents(id, name, display_name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createCommunication(
  communication: {
    task_id?: string
    company_id?: string
    channel_type: string
    channel_reference: string
    direction: 'inbound' | 'outbound'
    summary: string
    metadata?: any
  }
) {
  const { data, error } = await supabase
    .from('communications')
    .insert(communication)
    .select()
    .single()
  
  if (error) throw error
  return data
}
