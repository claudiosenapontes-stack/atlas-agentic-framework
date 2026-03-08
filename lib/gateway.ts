import { getRedisClient, publishEvent } from '@/lib/redis'

const GATEWAY_URL = process.env.GATEWAY_API_URL || 'http://localhost:3001'

// ============================================
// GATEWAY API CLIENT
// ============================================

export async function gatewayHealthCheck(): Promise<{ healthy: boolean; services: any }> {
  try {
    const response = await fetch(`${GATEWAY_URL}/health`)
    if (!response.ok) throw new Error('Gateway not responding')
    const data = await response.json()
    return { healthy: true, services: data }
  } catch (error) {
    return { healthy: false, services: {} }
  }
}

export async function claimTaskViaGateway(agentId: string, agentName: string) {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/tasks/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, agentName }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }
    
    const data = await response.json()
    
    // Publish Redis event
    if (data.taskId) {
      await publishEvent('execution.started', {
        task_id: data.taskId,
        agent_id: agentId,
      })
    }
    
    return { success: true, task: data.task, execution: data.execution }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function reportExecutionViaGateway(
  executionId: string,
  taskId: string,
  updates: {
    status: 'succeeded' | 'failed' | 'escalated'
    result?: string
    error?: string
  }
) {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/executions/${executionId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, ...updates }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getQueueStatusViaGateway() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/queues/status`)
    if (!response.ok) throw new Error('Failed to fetch queue status')
    const data = await response.json()
    return { success: true, queues: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getServiceHealthViaGateway() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/services/health`)
    if (!response.ok) throw new Error('Failed to fetch service health')
    const data = await response.json()
    return { success: true, services: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
