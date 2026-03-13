// Redis event publisher/subscriber for real-time updates
// Used for SSE streaming to Mission Control

import Redis from 'ioredis';

// Redis connection config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for publishing
let publisher: Redis | null = null;

// Redis client for subscribing
let subscriber: Redis | null = null;

// Callback registry for subscribers
const subscribers = new Map<string, Set<(data: unknown) => void>>();

// Initialize Redis clients
function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
    
    publisher.on('error', (err) => {
      console.error('[RedisEvents] Publisher error:', err);
    });
  }
  return publisher;
}

function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
    
    subscriber.on('error', (err) => {
      console.error('[RedisEvents] Subscriber error:', err);
    });
    
    // Handle incoming messages
    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        const callbacks = subscribers.get(channel);
        if (callbacks) {
          callbacks.forEach(cb => {
            try {
              cb(data);
            } catch (err) {
              console.error('[RedisEvents] Subscriber callback error:', err);
            }
          });
        }
      } catch (err) {
        console.error('[RedisEvents] Failed to parse message:', err);
      }
    });
  }
  return subscriber;
}

// Publish an event to a channel
export async function publishEvent(channel: string, data: unknown): Promise<void> {
  try {
    const pub = getPublisher();
    await pub.publish(channel, JSON.stringify(data));
  } catch (error) {
    console.error(`[RedisEvents] Failed to publish to ${channel}:`, error);
  }
}

// Subscribe to a channel
export function subscribe(channel: string, callback: (data: unknown) => void): () => void {
  const sub = getSubscriber();
  
  // Track callback
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());
    sub.subscribe(channel).catch(err => {
      console.error(`[RedisEvents] Failed to subscribe to ${channel}:`, err);
    });
  }
  
  subscribers.get(channel)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const callbacks = subscribers.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        sub.unsubscribe(channel).catch(err => {
          console.error(`[RedisEvents] Failed to unsubscribe from ${channel}:`, err);
        });
        subscribers.delete(channel);
      }
    }
  };
}

// Publish agent status update
export async function publishAgentStatus(agentId: string, status: Record<string, unknown>): Promise<void> {
  await publishEvent('agent:status', { agent_id: agentId, ...status });
  await publishEvent(`agent:${agentId}:status`, status);
}

// Publish task update
export async function publishTaskUpdate(taskId: string, update: Record<string, unknown>): Promise<void> {
  await publishEvent('task:updates', { task_id: taskId, ...update });
  await publishEvent(`task:${taskId}`, update);
}

// Get Redis health status
export async function getRedisHealth(): Promise<{ connected: boolean; ready: boolean }> {
  try {
    const pub = getPublisher();
    await pub.ping();
    return { connected: true, ready: true };
  } catch (error) {
    return { connected: false, ready: false };
  }
}

// Graceful shutdown
export async function closeRedisConnections(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}
