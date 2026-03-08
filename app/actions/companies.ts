'use server'

import { supabase } from '@/lib/supabase'

export async function getCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('status', 'active')
    .order('name')
  
  if (error) throw error
  return data || []
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      projects:projects(*),
      agents:agents!agents_company_id_fkey(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function getCompanyStats(companyId: string) {
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
}
