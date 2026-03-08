'use server'

import { supabase } from '@/lib/supabase'

export async function getCompanies() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (error) {
      console.error('[getCompanies] Supabase error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[getCompanies] Exception:', err)
    return []
  }
}

export async function getCompanyById(id: string) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        projects:projects(*),
        agents:agents!agents_company_id_fkey(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('[getCompanyById] Supabase error:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[getCompanyById] Exception:', err)
    return null
  }
}

export async function getCompanyStats(companyId: string) {
  try {
    const { count: tasksTotal } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
    
    const { count: tasksActive } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .not('status', 'in', '(completed,archived,canceled)')
    
    const { count: projects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
    
    const { count: openIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['open', 'in_progress'])
    
    return {
      tasksTotal: tasksTotal || 0,
      tasksActive: tasksActive || 0,
      projects: projects || 0,
      openIncidents: openIncidents || 0,
    }
  } catch (err) {
    console.error('[getCompanyStats] Exception:', err)
    return {
      tasksTotal: 0,
      tasksActive: 0,
      projects: 0,
      openIncidents: 0,
    }
  }
}