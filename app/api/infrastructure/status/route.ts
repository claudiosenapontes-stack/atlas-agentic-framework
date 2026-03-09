import { NextRequest, NextResponse } from "next/server";

// Infrastructure service URLs
const SERVICES = {
  spawner: process.env.SPAWNER_URL || 'http://localhost:9999',
  killer: process.env.KILLER_URL || 'http://localhost:9998',
  aggregator: process.env.AGGREGATOR_URL || 'http://localhost:9997',
  health: process.env.HEALTH_URL || 'http://localhost:9996',
};

async function checkService(name: string, url: string) {
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
      };
    }
    
    return {
      name,
      url,
      status: response ? 'degraded' : 'offline',
      error: response ? `HTTP ${response.status}` : 'Connection failed',
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  try {
    // Check all infrastructure services
    const services = await Promise.all([
      checkService('spawner', SERVICES.spawner),
      checkService('killer', SERVICES.killer),
      checkService('aggregator', SERVICES.aggregator),
      checkService('health', SERVICES.health),
    ]);

    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;

    return NextResponse.json({
      success: true,
      services,
      summary: {
        online: onlineCount,
        total: totalCount,
        allOnline: onlineCount === totalCount,
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
        summary: { online: 0, total: 4, allOnline: false },
      },
      { status: 500 }
    );
  }
}
