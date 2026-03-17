// Server-side admin client with connection pooling
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
  
  // Use pooled connection for serverless environments
  const poolerUrl = url.replace('.supabase.co', '.supabase.co') + '?pgbouncer=true'
  
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: {
      schema: 'public'
    },
    global: {
      // Add fetch options for connection pooling
      fetch: (url: any, options: any) => fetch(url, {
        ...options,
        keepalive: true
      })
    }
  })
  
  return client
}

// DB retry wrapper - centralized for all routes
const DB_TIMEOUT_MS = 3000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 150;

export async function withDbRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: any;
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timeout`)), DB_TIMEOUT_MS)
      );
      return await Promise.race([fn(), timeoutPromise]) as T;
    } catch (err) {
      lastError = err;
      const errorSource = err instanceof Error && err.message?.includes('timeout') ? 'db_timeout' : 'db_connection';
      console.log(JSON.stringify({
        level: 'warn',
        operation,
        retryCount: i + 1,
        maxRetries: RETRY_ATTEMPTS,
        errorSource,
        error: err instanceof Error ? err.message : String(err)
      }));
      if (i < RETRY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }
  throw lastError;
}
