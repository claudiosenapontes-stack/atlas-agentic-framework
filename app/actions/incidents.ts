'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getIncidents(status?: string) {
  let query = supabase
    .from('incidents')
    .select(`
      *,
      company:companies(id, name),
      reported_by:agents!incidents_reported_by_agent_id_fkey(id, name, display_name)
    `)
    .order('opened_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function resolveIncident(id: string, resolutionNote?: string) {
  const { error } = await supabase
    .from('incidents')
    .update({
      status: 'resolved',
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) throw error
  revalidatePath('/incidents')
}

export async function createIncident(formData: FormData) {
  const summary = formData.get('summary') as string
  const severity = formData.get('severity') as string
  const companyId = formData.get('company_id') as string
  
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      summary,
      severity,
      company_id: companyId,
      status: 'open'
    })
    .select()
    .single()
  
  if (error) throw error
  revalidatePath('/incidents')
  return data
}
