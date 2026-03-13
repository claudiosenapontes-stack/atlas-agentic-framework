// Server-side admin client
import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  console.log('[SupabaseAdmin] URL:', url ? 'set' : 'missing', 'Key:', key ? 'set' : 'missing')
  
  if (!url || !key) {
    throw new Error('Supabase admin credentials missing')
  }
  
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  return client
}
