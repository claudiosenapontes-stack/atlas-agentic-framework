import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AgentProfile {
  id: string;
  name: string;
  display_name: string;
  role: string;
  description: string;
  skills: string[];
  capabilities: string[];
  model: string;
  provider: string;
  status: 'active' | 'inactive' | 'degraded';
  routing_enabled: boolean;
  process_id?: number;
  uptime?: string;
  restart_count?: number;
  memory_mb?: number;
  last_config_update: string;
  is_live: boolean;
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // Get PM2 process data
    let pm2Data: any[] = [];
    try {
      const pm2Output = execSync('pm2 jlist', { encoding: 'utf-8', timeout: 10000 });
      pm2Data = JSON.parse(pm2Output);
    } catch (e) {
      console.error('[Agents] PM2 query failed:', e);
    }

    // Get model routing config
    let routingConfig: any = {};
    try {
      const routingPath = join(process.cwd(), 'config', 'model-routing.json');
      if (existsSync(routingPath)) {
        routingConfig = JSON.parse(readFileSync(routingPath, 'utf-8'));
      }
    } catch (e) {
      console.error('[Agents] Routing config read failed:', e);
    }

    // Define core agents
    const agentDefs = [
      { name: 'henry', display_name: 'Henry', role: 'Chief Operating Officer', workspace: 'henry' },
      { name: 'optimus', display_name: 'Optimus', role: 'Infrastructure Lead', workspace: 'optimus' },
      { name: 'prime', display_name: 'Prime', role: 'UI/UX Lead', workspace: 'optimus-prime' },
      { name: 'olivia', display_name: 'Olivia', role: 'Communications Lead', workspace: 'olivia' },
      { name: 'harvey', display_name: 'Harvey', role: 'Legal/Compliance', workspace: 'harvey' },
      { name: 'einstein', display_name: 'Einstein', role: 'Research & Analysis', workspace: 'einstein' },
      { name: 'sophia', display_name: 'Sophia', role: 'Strategy & Planning', workspace: 'sophia' },
      { name: 'severino', display_name: 'Severino', role: 'Runtime & Monitoring', workspace: 'severino' },
    ];

    const agents: AgentProfile[] = agentDefs.map(def => {
      // Find PM2 process for this agent
      const workerProcess = pm2Data.find((p: any) => 
        p.name === `worker-${def.name}` || p.name === `agent-${def.name}`
      );
      
      // Read SOUL.md for description
      let description = `${def.role} agent`;
      let capabilities: string[] = [];
      try {
        const soulPath = join('/root/.openclaw/workspaces', def.workspace, 'SOUL.md');
        if (existsSync(soulPath)) {
          const soulContent = readFileSync(soulPath, 'utf-8');
          // Extract first paragraph as description
          const firstPara = soulContent.split('\n\n')[0];
          if (firstPara && firstPara.length > 10) {
            description = firstPara.replace(/^#.*\n/, '').trim().substring(0, 200);
          }
          // Extract capabilities from Core Truths or Boundaries
          if (soulContent.includes('capabilities') || soulContent.includes('Responsible for')) {
            const caps = soulContent.match(/(?:Responsible for|capabilities include|can)[^.]+/gi);
            if (caps) capabilities = caps.slice(0, 3).map(c => c.trim());
          }
        }
      } catch (e) {
        // Fallback description
      }

      // Get model from routing config or default
      const routeKey = Object.keys(routingConfig.routes || {}).find(k => 
        def.name.includes(k) || k.includes(def.name)
      );
      const model = routeKey ? routingConfig.routes[routeKey] : 'openrouter/kimi-k2.5';

      const isActive = !!workerProcess && workerProcess.pm2_env?.status === 'online';
      
      return {
        id: def.name,
        name: def.name,
        display_name: def.display_name,
        role: def.role,
        description: description,
        skills: capabilities.length > 0 ? capabilities : ['Core operations', def.role],
        capabilities: capabilities.length > 0 ? capabilities : ['Task execution', 'Coordination'],
        model: model,
        provider: 'OpenRouter',
        status: isActive ? 'active' : 'inactive',
        routing_enabled: true,
        process_id: workerProcess?.pid,
        uptime: workerProcess?.pm2_env?.pm_uptime 
          ? formatUptime(Date.now() - workerProcess.pm2_env.pm_uptime)
          : undefined,
        restart_count: workerProcess?.pm2_env?.restart_time || 0,
        memory_mb: workerProcess?.monit?.memory 
          ? Math.round(workerProcess.monit.memory / 1024 / 1024)
          : undefined,
        last_config_update: timestamp,
        is_live: true,
      };
    });

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
      timestamp,
      source: 'live',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('[Agents] Error fetching profiles:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp,
    }, { status: 500 });
  }
}

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
