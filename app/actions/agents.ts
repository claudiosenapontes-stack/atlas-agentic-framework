'use server'

import { supabase } from '@/lib/supabase'

export async function getAgents() {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('[getAgents] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getAgents] Exception:', err)
    return []
  }
}

export async function getAgentById(id: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return null
  return data
}

export async function updateAgentStatus(id: string, status: string) {
  const { error } = await supabase
    .from('agents')
    .update({ status })
    .eq('id', id)
  
  if (error) throw error
}
