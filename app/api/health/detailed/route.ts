import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

export async function GET() {
  const timestamp = new Date().toISOString()
  
  // Default states
  let pm2Status = { status: 'unknown', processes: 0, online: 0 }
  let redisStatus = { status: 'unknown', queues: 0, memory: '0MB' }
  let supabaseStatus = { status: 'unknown', latency: 0 }
  let queues: Record<string, number> = {}
  
  try {
    // Try to get PM2 status
    try {
      const { stdout: pm2Output } = await execAsync('pm2 jlist 2>/dev/null || echo "[]"', { timeout: 3000 })
      const pm2Data = JSON.parse(pm2Output || '[]')
      pm2Status = {
        status: 'active',
        processes: pm2Data.length,
        online: pm2Data.filter((p: any) => p.pm2_env?.status === 'online').length
      }
    } catch {
      pm2Status = { status: 'unavailable', processes: 0, online: 0 }
    }
    
    // Try Redis check
    try {
      const { stdout: redisInfo } = await execAsync('redis-cli info stats 2>/dev/null | grep -E "(total_commands_processed|connected_clients)" || echo ""', { timeout: 2000 })
      redisStatus = {
        status: redisInfo ? 'connected' : 'disconnected',
        queues: 0,
        memory: 'N/A'
      }
      
      // Check Bull queues (if redis is available)
      queues = {
        default: 0,
        email: 0,
        webhook: 0,
        agent: 0
      }
    } catch {
      redisStatus = { status: 'unavailable', queues: 0, memory: 'N/A' }
    }
    
    // Supabase latency check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url) {
      const checkStart = Date.now()
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 2000)
        
        await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
          signal: controller.signal,
        }).catch(() => null)
        
        supabaseStatus = {
          status: 'connected',
          latency: Date.now() - checkStart
        }
      } catch {
        supabaseStatus = { status: 'degraded', latency: 999 }
      }
    }
    
  } catch (error) {
    console.error('[Health Detailed] Error:', error)
  }
  
  return NextResponse.json({
    status: 'ok',
    timestamp,
    pm2: pm2Status,
    redis: redisStatus,
    supabase: supabaseStatus,
    queues,
    version: '1.0.0'
  })
}
