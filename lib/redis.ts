import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected')
    })
  }
  return redisClient
}

// ============================================
// QUEUE OPERATIONS
// ============================================

export async function enqueueTask(queueName: string, taskId: string, priority: string = 'medium') {
  const redis = getRedisClient()
  const priorityScore = priorityToScore(priority)
  
  await redis.zadd(queueName, priorityScore, JSON.stringify({
    task_id: taskId,
    priority,
    timestamp: new Date().toISOString(),
  }))
  
  // Publish event
  await redis.publish('event:task.assigned', JSON.stringify({
    queue: queueName,
    task_id: taskId,
  }))
}

export async function dequeueTask(queueName: string) {
  const redis = getRedisClient()
  const items = await redis.zpopmin(queueName, 1)
  
  if (!items || items.length === 0) return null
  return JSON.parse(items[0])
}

export async function getQueueDepth(queueName: string) {
  const redis = getRedisClient()
  return await redis.zcard(queueName)
}

export async function getAllQueueDepths() {
  try {
    const redis = getRedisClient()
    const agents = ['henry', 'olivia', 'harvey', 'sophia', 'einstein', 'optimus', 'prime', 'severino']
    
    const depths: Record<string, number> = {}
    
    for (const agent of agents) {
      const depth = await redis.zcard(`queue:tasks:${agent}`).catch(() => 0)
      depths[`queue:tasks:${agent}`] = depth
    }
    
    // Also check system queues
    depths['queue:incidents'] = await redis.zcard('queue:incidents').catch(() => 0)
    depths['queue:approvals'] = await redis.zcard('queue:approvals').catch(() => 0)
    depths['queue:retries'] = await redis.zcard('queue:retries').catch(() => 0)
    
    return depths
  } catch (err) {
    console.error('[getAllQueueDepths] Redis error:', err)
    // Return empty queues as fallback
    return {
      'queue:tasks:henry': 0,
      'queue:tasks:olivia': 0,
      'queue:tasks:harvey': 0,
      'queue:tasks:sophia': 0,
      'queue:tasks:einstein': 0,
      'queue:tasks:optimus': 0,
      'queue:tasks:prime': 0,
      'queue:tasks:severino': 0,
      'queue:incidents': 0,
      'queue:approvals': 0,
      'queue:retries': 0,
    }
  }
}

// ============================================
// DISTRIBUTED LOCKS
// ============================================

export async function acquireLock(lockKey: string, ttlSeconds: number = 300) {
  const redis = getRedisClient()
  const token = `${Date.now()}-${Math.random()}`
  
  const acquired = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX')
  
  if (!acquired) return null
  
  return {
    release: async () => {
      const current = await redis.get(lockKey)
      if (current === token) {
        await redis.del(lockKey)
      }
    }
  }
}

// ============================================
// PRESENCE
// ============================================

export async function updatePresence(agentName: string, status: string, currentTask?: string) {
  const redis = getRedisClient()
  const key = `presence:agent:${agentName}`
  
  await redis.hset(key, {
    status,
    current_task: currentTask || '',
    last_seen: new Date().toISOString(),
  })
  
  await redis.expire(key, 300)
}

export async function getPresence(agentName: string) {
  const redis = getRedisClient()
  const key = `presence:agent:${agentName}`
  return await redis.hgetall(key)
}

export async function getAllPresence() {
  try {
    const redis = getRedisClient()
    const keys = await redis.keys('presence:agent:*').catch(() => [])
    const presence: Record<string, any> = {}
    
    for (const key of keys) {
      const agentName = key.replace('presence:agent:', '')
      const data = await redis.hgetall(key).catch(() => null)
      if (data && Object.keys(data).length > 0) {
        presence[agentName] = data
      }
    }
    
    return presence
  } catch (err) {
    console.error('[getAllPresence] Redis error:', err)
    // Return empty presence as fallback
    return {}
  }
}

// ============================================
// EVENT PUBLISHING
// ============================================

export async function publishEvent(eventType: string, payload: any) {
  const redis = getRedisClient()
  await redis.publish(`event:${eventType}`, JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  }))
}

// ============================================
// HELPERS
// ============================================

function priorityToScore(priority: string): number {
  const scores: Record<string, number> = {
    urgent: 1,
    high: 10,
    medium: 50,
    low: 100,
  }
  return scores[priority] || 50
}

export const LockKeys = {
  task: (id: string) => `lock:task:${id}`,
  execution: (id: string) => `lock:execution:${id}`,
}
