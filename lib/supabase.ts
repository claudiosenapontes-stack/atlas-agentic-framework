import { createClient } from '@supabase/supabase-js'
import { supabase as mockSupabase } from './supabase-mock'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Debug logging for serverless environment
if (typeof window === 'undefined') {
  console.log('[Supabase] URL exists:', !!supabaseUrl)
  console.log('[Supabase] Key exists:', !!supabaseKey)
  console.log('[Supabase] URL length:', supabaseUrl?.length)
}

// Use mock data if Supabase credentials are empty or if MOCK_MODE is set
const useMock = !supabaseUrl || !supabaseKey || process.env.MOCK_MODE === 'true'

let supabaseClient: any

try {
  supabaseClient = useMock ? mockSupabase : createClient(supabaseUrl, supabaseKey)
  if (typeof window === 'undefined') {
    console.log('[Supabase] Client created successfully')
  }
} catch (error) {
  console.error('[Supabase] Failed to create client:', error)
  supabaseClient = mockSupabase
}

export const supabase = supabaseClient
