import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Track last seen timestamps for diff detection
const lastSeen = new Map<string, string>()

async function fetchAgents(agentId?: string | null) {
  let query = supabase
    .from('agents')
    .select('name, display_name, status, role, last_seen, updated_at, session_key, model, context_tokens, memory_usage_mb, cpu_percent, queue_depth, current_task')
    .order('updated_at', { ascending: false })
  
  if (agentId) {
    query = query.eq('name', agentId)
  }
  
  const { data, error } = await query
  if (error) {
    console.error('[SSE] Failed to fetch agents:', error)
    return []
  }
  return data || []
}

async function fetchTasks(taskId?: string | null) {
  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, assigned_agent_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (taskId) {
    query = query.eq('id', taskId)
  }
  
  const { data, error } = await query
  if (error) {
    console.error('[SSE] Failed to fetch tasks:', error)
    return []
  }
  return data || []
}

async function fetchEvents(companyId?: string | null) {
  let query = supabase
    .from('events')
    .select('id, event_type, actor_type, actor_id, target_type, target_id, routed_to_agent_id, routing_reason, model_used, payload, source_channel, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  
  const { data, error } = await query
  if (error) {
    console.error('[SSE] Failed to fetch events:', error)
    return []
  }
  return data || []
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  const agentId = req.nextUrl.searchParams.get('agentId')
  const taskId = req.nextUrl.searchParams.get('taskId')
  const companyId = req.nextUrl.searchParams.get('companyId')

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (err) {
          console.error('[SSE] Failed to send:', err)
        }
      }

      // Send connection confirmation
      send('connected', { 
        ok: true, 
        ts: new Date().toISOString(),
        source: 'supabase-polling',
        interval: 2000
      })

      // Initial data load
      const initialAgents = await fetchAgents(agentId)
      const initialTasks = await fetchTasks(taskId)
      
      send('agents:initial', { agents: initialAgents })
      send('tasks:initial', { tasks: initialTasks })

      // Mark initial data as seen
      initialAgents.forEach((a: any) => lastSeen.set(`agent:${a.name}`, a.updated_at))
      initialTasks.forEach((t: any) => lastSeen.set(`task:${t.id}`, t.created_at))

      // Poll Supabase every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          // Check for agent changes
          const agents = await fetchAgents(agentId)
          const changedAgents = agents.filter((a: any) => {
            const key = `agent:${a.name}`
            const last = lastSeen.get(key)
            if (!last || new Date(a.updated_at) > new Date(last)) {
              lastSeen.set(key, a.updated_at)
              return true
            }
            return false
          })
          
          if (changedAgents.length > 0) {
            send('agent:status', { 
              ts: new Date().toISOString(),
              agents: changedAgents 
            })
          }

          // Check for task changes
          const tasks = await fetchTasks(taskId)
          const changedTasks = tasks.filter((t: any) => {
            const key = `task:${t.id}`
            const last = lastSeen.get(key)
            if (!last || new Date(t.created_at) > new Date(last)) {
              lastSeen.set(key, t.created_at)
              return true
            }
            return false
          })
          
          if (changedTasks.length > 0) {
            send('task:updates', { 
              ts: new Date().toISOString(),
              tasks: changedTasks 
            })
          }

          // Check for new canonical events
          const events = await fetchEvents(companyId)
          const newEvents = events.filter((e: any) => {
            const key = `event:${e.id}`
            const last = lastSeen.get(key)
            if (!last) {
              lastSeen.set(key, e.created_at)
              return true
            }
            return false
          })
          
          if (newEvents.length > 0) {
            // Group events by type for richer streaming
            const grouped = newEvents.reduce((acc: any, e: any) => {
              const type = e.event_type
              if (!acc[type]) acc[type] = []
              acc[type].push(e)
              return acc
            }, {})
            
            send('events:batch', { 
              ts: new Date().toISOString(),
              count: newEvents.length,
              events: grouped
            })
          }
        } catch (err) {
          console.error('[SSE] Poll error:', err)
        }
      }, 2000)

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        send('heartbeat', { ts: new Date().toISOString() })
      }, 15000)

      // Cleanup
      const cleanup = () => {
        clearInterval(pollInterval)
        clearInterval(heartbeat)
      }
      ;(controller as any)._cleanup = cleanup
    },
    cancel() {
      const cleanup = (this as any)._cleanup
      if (cleanup) cleanup()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
