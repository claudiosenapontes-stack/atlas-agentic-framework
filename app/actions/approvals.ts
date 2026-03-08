'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getApprovals(status?: string) {
  let query = supabase
    .from('approvals')
    .select(`
      *,
      task:tasks(id, title)
    `)
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function respondToApproval(id: string, decision: 'approved' | 'rejected', note?: string) {
  const updates: any = {
    status: decision,
    decision_note: note
  }
  
  if (decision === 'approved') {
    updates.approved_at = new Date().toISOString()
  } else {
    updates.rejected_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('approvals')
    .update(updates)
    .eq('id', id)
  
  if (error) throw error
  revalidatePath('/approvals')
}

export async function createApproval(formData: FormData) {
  const taskId = formData.get('task_id') as string
  const actionType = formData.get('action_type') as string
  const approverType = formData.get('approver_type') as string
  
  const { data, error } = await supabase
    .from('approvals')
    .insert({
      task_id: taskId,
      action_type: actionType,
      approver_type: approverType,
      status: 'pending'
    })
    .select()
    .single()
  
  if (error) throw error
  revalidatePath('/approvals')
  return data
}
