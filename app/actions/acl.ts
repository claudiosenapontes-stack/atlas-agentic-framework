'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ============================================
// PHASE 4 ACL PROCESSOR
// Access Control List management for Atlas Agentic Framework
// ============================================

export interface ACLRule {
  id?: string
  resource_type: 'agent' | 'company' | 'task' | 'execution' | 'communication' | 'approval' | 'incident'
  resource_id?: string
  subject_type: 'agent' | 'role' | 'company'
  subject_id: string
  permission: 'read' | 'write' | 'execute' | 'admin' | 'none'
  conditions?: Record<string, any>
  priority: number
  expires_at?: string
  created_by?: string
}

export interface ACLCheckResult {
  allowed: boolean
  rule?: ACLRule
  reason?: string
}

// ============================================
// CRUD OPERATIONS
// ============================================

export async function createACLRule(rule: Omit<ACLRule, 'id'>): Promise<ACLRule | null> {
  try {
    const { data, error } = await supabase
      .from('acl_rules')
      .insert({
        resource_type: rule.resource_type,
        resource_id: rule.resource_id,
        subject_type: rule.subject_type,
        subject_id: rule.subject_id,
        permission: rule.permission,
        conditions: rule.conditions || {},
        priority: rule.priority || 100,
        expires_at: rule.expires_at,
        created_by: rule.created_by
      })
      .select()
      .single()
    
    if (error) {
      console.error('[ACL] Create error:', error)
      return null
    }
    
    revalidatePath('/acl')
    return data as ACLRule
  } catch (err) {
    console.error('[ACL] Create exception:', err)
    return null
  }
}

export async function getACLRules(filters?: {
  resource_type?: string
  subject_id?: string
  permission?: string
}): Promise<ACLRule[]> {
  try {
    let query = supabase
      .from('acl_rules')
      .select('*')
      .order('priority', { ascending: true })
    
    if (filters?.resource_type) {
      query = query.eq('resource_type', filters.resource_type)
    }
    if (filters?.subject_id) {
      query = query.eq('subject_id', filters.subject_id)
    }
    if (filters?.permission) {
      query = query.eq('permission', filters.permission)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[ACL] Get error:', error)
      return []
    }
    
    return data as ACLRule[] || []
  } catch (err) {
    console.error('[ACL] Get exception:', err)
    return []
  }
}

export async function updateACLRule(id: string, updates: Partial<ACLRule>): Promise<ACLRule | null> {
  try {
    const { data, error } = await supabase
      .from('acl_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('[ACL] Update error:', error)
      return null
    }
    
    revalidatePath('/acl')
    return data as ACLRule
  } catch (err) {
    console.error('[ACL] Update exception:', err)
    return null
  }
}

export async function deleteACLRule(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('acl_rules')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('[ACL] Delete error:', error)
      return false
    }
    
    revalidatePath('/acl')
    return true
  } catch (err) {
    console.error('[ACL] Delete exception:', err)
    return false
  }
}

// ============================================
// ACL CHECKS
// ============================================

export async function checkAccess(
  subjectId: string,
  resourceType: ACLRule['resource_type'],
  resourceId?: string,
  requestedPermission: ACLRule['permission'] = 'read'
): Promise<ACLCheckResult> {
  try {
    // Get all applicable rules
    let query = supabase
      .from('acl_rules')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('resource_type', resourceType)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('priority', { ascending: true })
    
    const { data: rules, error } = await query
    
    if (error) {
      console.error('[ACL] Check error:', error)
      return { allowed: false, reason: 'System error' }
    }
    
    if (!rules || rules.length === 0) {
      return { allowed: false, reason: 'No matching rules' }
    }
    
    // Find highest priority matching rule
    for (const rule of rules) {
      // Check resource_id specificity
      if (rule.resource_id && rule.resource_id !== resourceId) {
        continue
      }
      
      // Check permission level
      const permissionLevels = { none: 0, read: 1, write: 2, execute: 3, admin: 4 }
      const requiredLevel = permissionLevels[requestedPermission] || 0
      const grantedLevel = permissionLevels[rule.permission as keyof typeof permissionLevels] || 0
      
      if (grantedLevel >= requiredLevel) {
        return { allowed: true, rule }
      }
    }
    
    return { allowed: false, reason: 'Insufficient permissions' }
  } catch (err) {
    console.error('[ACL] Check exception:', err)
    return { allowed: false, reason: 'System error' }
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function getResourcePermissions(
  resourceType: ACLRule['resource_type'],
  resourceId?: string
): Promise<Record<string, ACLRule['permission']>> {
  try {
    let query = supabase
      .from('acl_rules')
      .select('*')
      .eq('resource_type', resourceType)
      .or('expires_at.is.null,expires_at.gt.now()')
    
    if (resourceId) {
      query = query.or(`resource_id.is.null,resource_id.eq.${resourceId}`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[ACL] Get permissions error:', error)
      return {}
    }
    
    const permissions: Record<string, ACLRule['permission']> = {}
    
    for (const rule of (data as ACLRule[]) || []) {
      const key = `${rule.subject_type}:${rule.subject_id}`
      // Higher priority overrides lower
      if (!permissions[key] || rule.priority < 100) {
        permissions[key] = rule.permission
      }
    }
    
    return permissions
  } catch (err) {
    console.error('[ACL] Get permissions exception:', err)
    return {}
  }
}

export async function bulkCreateRules(rules: any[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('acl_rules')
      .insert(rules)
    
    if (error) {
      console.error('[ACL] Bulk create error:', error)
      return false
    }
    
    revalidatePath('/acl')
    return true
  } catch (err) {
    console.error('[ACL] Bulk create exception:', err)
    return false
  }
}

// ============================================
// DEFAULT RULES SEEDER
// ============================================

export async function seedDefaultACLRules(): Promise<boolean> {
  const defaultRules: any[] = [
    // Henry (CEO) - Full admin access
    { resource_type: 'agent', subject_type: 'agent', subject_id: 'henry', permission: 'admin', priority: 1 },
    { resource_type: 'company', subject_type: 'agent', subject_id: 'henry', permission: 'admin', priority: 1 },
    { resource_type: 'task', subject_type: 'agent', subject_id: 'henry', permission: 'admin', priority: 1 },
    
    // Optimus (Tech Lead) - Execute and write
    { resource_type: 'agent', subject_type: 'agent', subject_id: 'optimus', permission: 'write', priority: 10 },
    { resource_type: 'task', subject_type: 'agent', subject_id: 'optimus', permission: 'execute', priority: 10 },
    
    // Einstein (Research) - Read/Write on tasks
    { resource_type: 'task', subject_type: 'agent', subject_id: 'einstein', permission: 'write', priority: 20 },
    
    // Olivia (EA) - Read on communications and approvals
    { resource_type: 'communication', subject_type: 'agent', subject_id: 'olivia', permission: 'write', priority: 10 },
    { resource_type: 'approval', subject_type: 'agent', subject_id: 'olivia', permission: 'write', priority: 10 },
    
    // Harvey (Finance) - Read on companies and agents
    { resource_type: 'company', subject_type: 'agent', subject_id: 'harvey', permission: 'read', priority: 20 },
    
    // System agents - Execute only
    { resource_type: 'execution', subject_type: 'role', subject_id: 'system', permission: 'execute', priority: 50 },
  ]
  
  return await bulkCreateRules(defaultRules)
}