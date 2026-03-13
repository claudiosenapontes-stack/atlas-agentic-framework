'use server'

import { supabase } from '@/lib/supabase'

export interface MCEvent {
  id: string
  event_type: string
  event_data: any
  agent_id: string | null
  task_id: string | null
  company_id: string | null
  created_at: string
  source: string | null
  severity: 'info' | 'warning' | 'error' | 'critical' | null
}

export async function getEvents(filters?: {
  eventType?: string
  agentId?: string
  taskId?: string
  companyId?: string
  severity?: string
  limit?: number
  since?: string
}) {
  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        company:companies(id, name),
        agent:agents(id, name, display_name),
        task:tasks(id, title)
      `)
      .order('created_at', { ascending: false })

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType)
    }
    if (filters?.agentId) {
      query = query.eq('agent_id', filters.agentId)
    }
    if (filters?.taskId) {
      query = query.eq('task_id', filters.taskId)
    }
    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.since) {
      query = query.gte('created_at', filters.since)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(100)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('[getEvents] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getEvents] Exception:', err)
    return []
  }
}

export async function getEventStats(timeRange: '1h' | '24h' | '7d' = '24h') {
  try {
    const since = new Date()
    switch (timeRange) {
      case '1h':
        since.setHours(since.getHours() - 1)
        break
      case '24h':
        since.setDate(since.getDate() - 1)
        break
      case '7d':
        since.setDate(since.getDate() - 7)
        break
    }

    const { data, error } = await supabase
      .from('events')
      .select('event_type, severity, count')
      .gte('created_at', since.toISOString())
      .group('event_type, severity')

    if (error) {
      console.error('[getEventStats] Supabase error:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[getEventStats] Exception:', err)
    return null
  }
}
