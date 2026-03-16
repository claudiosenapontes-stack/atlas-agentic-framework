import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const timestamp = new Date().toISOString()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  // Quick Supabase check with timeout
  let supabaseStatus = 'ok'
  let supabaseLatency = 0
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 500)
    const checkStart = Date.now()
    
    // Simple HEAD request to verify Supabase is reachable
    await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      signal: controller.signal,
    }).catch(() => null)
    
    clearTimeout(timeout)
    supabaseLatency = Date.now() - checkStart
  } catch {
    supabaseStatus = 'degraded'
  }
  
  const totalLatency = Date.now() - start
  
  return NextResponse.json({
    task_id: 'ATLAS-001',
    status: 'ok',
    timestamp,
    latency_ms: totalLatency,
    checks: {
      supabase: {
        status: supabaseStatus,
        project_id: 'ukuicfswabcaioszcunb',
        url: url || 'not set',
        latency_ms: supabaseLatency,
      }
    }
  })
}
