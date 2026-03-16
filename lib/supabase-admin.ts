// Server-side admin client
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

// Check if we're in build/static generation phase
const isBuildPhase = typeof process !== 'undefined' && (
  process.env.NODE_ENV === 'production' && 
  (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)
)

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!url || !key) {
    console.error('[SupabaseAdmin] URL:', url ? 'set' : 'missing', 'Key:', key ? 'set' : 'missing')
    throw new Error('Supabase admin credentials missing')
  }
  
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  return client
}
