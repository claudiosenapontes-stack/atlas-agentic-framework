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
  if (useMock) {
    supabaseClient = mockSupabase
  } else {
    // Rail Infra Lock 2002: Reduced timeout from default 10s to 5s
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        // Reduced connection timeout to 5s (from default 10s)
        // This prevents long hangs during connection issues
      },
      global: {
        // Request timeout cap at 5s for DB operations
        fetch: (url: any, options: any) => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)
          return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timeout))
        },
      },
    })
  }
  if (typeof window === 'undefined') {
    console.log('[Supabase] Client created successfully with 5s timeout')
  }
} catch (error) {
  console.error('[Supabase] Failed to create client:', error)
  supabaseClient = mockSupabase
}

export const supabase = supabaseClient

// Rail Infra Lock 2002: Retry wrapper for DB calls
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  backoffMs: number = 200
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === maxRetries) break
      
      // Check if error is retryable
      const errorStr = String(error)
      const isRetryable = 
        errorStr.includes('timeout') ||
        errorStr.includes('connect') ||
        errorStr.includes('network') ||
        errorStr.includes('ETIMEDOUT') ||
        errorStr.includes('ECONNREFUSED')
      
      if (!isRetryable) {
        throw error
      }
      
      console.log(`[Supabase] Retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms`)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }
  
  throw lastError
}
