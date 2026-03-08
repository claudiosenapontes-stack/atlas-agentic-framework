'use server'

import { supabase } from '@/lib/supabase'

export async function getCommunications(limit: number = 50) {
  try {
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
    
    if (error) {
      console.error('[getCommunications] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getCommunications] Exception:', err)
    return []
  }
}

export async function getCommunicationsByTask(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        agent:agents(id, name, display_name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[getCommunicationsByTask] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getCommunicationsByTask] Exception:', err)
    return []
  }
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
  try {
    const { data, error } = await supabase
      .from('communications')
      .insert(communication)
      .select()
      .single()
    
    if (error) {
      console.error('[createCommunication] Supabase error:', error)
      throw error
    }
    return data
  } catch (err) {
    console.error('[createCommunication] Exception:', err)
    throw err
  }
}