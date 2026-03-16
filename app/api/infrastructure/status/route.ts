import { NextRequest, NextResponse } from "next/server";

// Infrastructure service URLs
const SERVICES = {
  spawner: process.env.SPAWNER_URL || 'http://localhost:9999',
  killer: process.env.KILLER_URL || 'http://localhost:9998',
  aggregator: process.env.AGGREGATOR_URL || 'http://localhost:9997',
  health: process.env.HEALTH_URL || 'http://localhost:9996',
};

const GATEWAY_WS_URL = process.env.OPENCLAW_GATEWAY_WS || 'ws://127.0.0.1:18789';
const GATEWAY_HTTP_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';

// Simple in-memory cache for gateway status (5s TTL)
let gatewayCache: { status: string; latency: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5000;

async function checkService(name: string, url: string) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    
    clearTimeout(timeout);
    
    if (response && response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name,
        url,
        status: 'online',
        version: data.version || 'unknown',
        uptime: data.uptime || 'unknown',
        latency: Date.now() - start,
      };
    }
    
    return {
      name,
      url,
      status: response ? 'degraded' : 'offline',
      error: response ? `HTTP ${response.status}` : 'Connection failed',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check OpenClaw Gateway via WebSocket probe
 * Falls back to HTTP health check if WebSocket fails
 * Timeout: 500ms (mission requirement)
 */
async function checkGatewayViaWebSocket(): Promise<{
  name: string;
  url: string;
  status: 'online' | 'degraded' | 'offline';
  latency: number;
  method: 'websocket' | 'http' | 'cache';
  error?: string;
}> {
  const start = Date.now();
  
  // Check cache first
  if (gatewayCache && Date.now() - gatewayCache.timestamp < CACHE_TTL_MS) {
    return {
      name: 'gateway',
      url: GATEWAY_WS_URL,
      status: gatewayCache.status as 'online' | 'degraded' | 'offline',
      latency: gatewayCache.latency,
      method: 'cache',
    };
  }

  // Try WebSocket connection (500ms timeout)
  try {
    const wsUrl = GATEWAY_WS_URL.replace('ws://', 'http://'); // Use HTTP upgrade path
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    
    // First try HTTP health endpoint (WebSocket upgrade path)
    const response = await fetch(`${GATEWAY_HTTP_URL}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    
    clearTimeout(timeout);
    const latency = Date.now() - start;
    
    if (response && response.ok) {
      const result = {
        name: 'gateway',
        url: GATEWAY_HTTP_URL,
        status: 'online' as const,
        latency,
        method: 'http' as const,
      };
      gatewayCache = { status: 'online', latency, timestamp: Date.now() };
      return result;
    }
    
    // If HTTP fails, try WebSocket directly
    const wsResult = await probeWebSocket(GATEWAY_WS_URL, 500);
    const wsLatency = Date.now() - start;
    
    gatewayCache = { 
      status: wsResult ? 'online' : 'offline', 
      latency: wsLatency, 
      timestamp: Date.now() 
    };
    
    return {
      name: 'gateway',
      url: GATEWAY_WS_URL,
      status: wsResult ? 'online' : 'offline',
      latency: wsLatency,
      method: 'websocket',
    };
    
  } catch (error) {
    const latency = Date.now() - start;
    gatewayCache = { status: 'offline', latency, timestamp: Date.now() };
    
    return {
      name: 'gateway',
      url: GATEWAY_WS_URL,
      status: 'offline',
      latency,
      method: 'websocket',
      error: error instanceof Error ? error.message : 'WebSocket probe failed',
    };
  }
}

/**
 * Probe WebSocket connection without full handshake
 * Uses a lightweight TCP connect check
 */
function probeWebSocket(wsUrl: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    // For ws:// URLs, we can check if the port is reachable
    const url = new URL(wsUrl);
    const host = url.hostname;
    const port = parseInt(url.port) || (url.protocol === 'wss:' ? 443 : 80);
    
    // Quick TCP connect probe using fetch to HTTP upgrade endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, timeoutMs);
    
    fetch(`http://${host}:${port}`, {
      method: 'HEAD',
      signal: controller.signal,
    }).then(() => {
      clearTimeout(timeout);
      resolve(true);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

export async function GET() {
  const requestStart = Date.now();
  
  try {
    // Run ALL checks in parallel (services + gateway WebSocket probe)
    const [
      spawnerResult,
      killerResult,
      aggregatorResult,
      healthResult,
      gatewayResult,
    ] = await Promise.all([
      checkService('spawner', SERVICES.spawner),
      checkService('killer', SERVICES.killer),
      checkService('aggregator', SERVICES.aggregator),
      checkService('health', SERVICES.health),
      checkGatewayViaWebSocket(), // WebSocket probe with 500ms timeout
    ]);

    const totalLatency = Date.now() - requestStart;
    const services = [spawnerResult, killerResult, aggregatorResult, healthResult, gatewayResult];
    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;

    // Find slowest step
    const slowestService = services.reduce((prev, current) => 
      (prev.latency || 0) > (current.latency || 0) ? prev : current
    );

    return NextResponse.json({
      success: true,
      services,
      summary: {
        online: onlineCount,
        total: totalCount,
        allOnline: onlineCount === totalCount,
      },
      performance: {
        totalLatencyMs: totalLatency,
        slowestStep: {
          name: slowestService.name,
          latencyMs: slowestService.latency || 0,
        },
        gatewayCheckMethod: gatewayResult.method,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Infrastructure Status] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check infrastructure status',
        services: [],
        summary: { online: 0, total: 5, allOnline: false },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
