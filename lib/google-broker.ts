'use server'

import { supabase } from '@/lib/supabase'

// ============================================
// GOOGLE BROKER CLIENT
// ============================================

const GOOGLE_BROKER_URL = process.env.GOOGLE_BROKER_URL || 'http://localhost:3002'

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  body?: string
  labels: string[]
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { email: string; responseStatus?: string }[]
  location?: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  createdTime: string
  modifiedTime: string
  webViewLink: string
}

// ============================================
// GMAIL OPERATIONS
// ============================================

export async function listEmails(
  identity: string,
  options: {
    maxResults?: number
    labelIds?: string[]
    query?: string
  } = {}
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/gmail/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...options }),
    })
    
    if (!response.ok) throw new Error('Failed to list emails')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendEmail(
  identity: string,
  email: {
    to: string[]
    subject: string
    body: string
    cc?: string[]
    bcc?: string[]
  }
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/gmail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...email }),
    })
    
    if (!response.ok) throw new Error('Failed to send email')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function draftEmail(
  identity: string,
  email: {
    to: string[]
    subject: string
    body: string
    cc?: string[]
    bcc?: string[]
  }
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/gmail/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...email }),
    })
    
    if (!response.ok) throw new Error('Failed to draft email')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// CALENDAR OPERATIONS
// ============================================

export async function listCalendarEvents(
  identity: string,
  options: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
  } = {}
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...options }),
    })
    
    if (!response.ok) throw new Error('Failed to list events')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createCalendarEvent(
  identity: string,
  event: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone?: string }
    end: { dateTime: string; timeZone?: string }
    attendees?: string[]
    location?: string
  }
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/calendar/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...event }),
    })
    
    if (!response.ok) throw new Error('Failed to create event')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// DRIVE OPERATIONS
// ============================================

export async function listDriveFiles(
  identity: string,
  options: {
    folderId?: string
    query?: string
    maxResults?: number
  } = {}
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/drive/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...options }),
    })
    
    if (!response.ok) throw new Error('Failed to list files')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createDoc(
  identity: string,
  doc: {
    title: string
    content?: string
    folderId?: string
  }
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/docs/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...doc }),
    })
    
    if (!response.ok) throw new Error('Failed to create doc')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createSheet(
  identity: string,
  sheet: {
    title: string
    data?: any[][]
    folderId?: string
  }
) {
  try {
    const response = await fetch(`${GOOGLE_BROKER_URL}/api/sheets/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, ...sheet }),
    })
    
    if (!response.ok) throw new Error('Failed to create sheet')
    return await response.json()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// APPROVAL-SAFE WRAPPER
// ============================================

export async function requestApprovalForEmail(
  taskId: string,
  requestedByAgentId: string,
  email: {
    to: string[]
    subject: string
    body: string
    identity: string
  }
) {
  // Store draft in Supabase
  const { data: approval, error } = await supabase
    .from('approvals')
    .insert({
      task_id: taskId,
      requested_by_agent_id: requestedByAgentId,
      approver_type: 'human',
      approver_reference: 'claudio',
      action_type: 'email_send',
      status: 'pending',
      payload: { email },
    })
    .select()
    .single()
  
  if (error) throw error
  return approval
}
