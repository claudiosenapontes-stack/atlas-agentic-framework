'use server'

import { supabase } from '@/lib/supabase'

export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
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
