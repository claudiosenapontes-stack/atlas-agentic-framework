'use server'

import { supabase } from '@/lib/supabase'

export interface Command {
  id: string
  source_channel: string
  command_text: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  target_model: string | null
  created_at: string
  updated_at: string
  agent_id: string | null
  company_id: string | null
  metadata: any
}

export async function getCommands(filters?: {
  status?: string
  sourceChannel?: string
  companyId?: string
  agentId?: string
  limit?: number
}) {
  try {
    let query = supabase
      .from('commands')
      .select(`
        *,
        company:companies(id, name),
        agent:agents(id, name, display_name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.sourceChannel) {
      query = query.eq('source_channel', filters.sourceChannel)
    }
    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId)
    }
    if (filters?.agentId) {
      query = query.eq('agent_id', filters.agentId)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('[getCommands] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getCommands] Exception:', err)
    return []
  }
}

export async function updateCommandStatus(
  id: string,
  status: Command['status'],
  metadata?: any
) {
  try {
    const updates: any = { status, updated_at: new Date().toISOString() }
    if (metadata) {
      updates.metadata = metadata
    }

    const { error } = await supabase
      .from('commands')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('[updateCommandStatus] Supabase error:', error)
      throw error
    }
  } catch (err) {
    console.error('[updateCommandStatus] Exception:', err)
    throw err
  }
}

export async function retryCommand(id: string) {
  try {
    const { error } = await supabase
      .from('commands')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[retryCommand] Supabase error:', error)
      throw error
    }
  } catch (err) {
    console.error('[retryCommand] Exception:', err)
    throw err
  }
}
