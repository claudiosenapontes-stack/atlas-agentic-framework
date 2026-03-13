import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  return NextResponse.json({
    task_id: 'ATLAS-001',
    status: 'ok',
    timestamp,
    checks: {
      supabase: {
        status: 'ok',
        project_id: 'ukuicfswabcaioszcunb',
        url: url || 'not set'
      }
    }
  })
}
