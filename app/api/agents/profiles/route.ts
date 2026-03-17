/**
 * ATLAS-AGENTS-PROFILES API
 * ATLAS-OPTIMUS-AGENTS-PROFILES-API-9829
 *
 * GET /api/agents/profiles
 * Returns real agent data from PM2, SOUL.md, AGENTS.md, and model-routing.json
 * Build: 9829-FORCE-$(date +%s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const execAsync = promisify(exec);

interface AgentProfile {
  name: string;
  role: string | null;
  title: string | null;
  status: string;
  pid: number | null;
  uptime: number | null;
  restarts: number | null;
  memory: number | null;
  model: string | null;
  provider: string | null;
  routing_enabled: boolean;
  skills: string[];
  is_live: boolean;
  last_heartbeat: string | null;
}

async function getPM2Processes(): Promise<any[]> {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

async function parseSoulMd(agentName: string): Promise<{ role: string | null; title: string | null }> {
  try {
    const soulPath = join(process.cwd(), '..', agentName, 'SOUL.md');
    const content = await readFile(soulPath, 'utf-8');

    // Extract role from first line or role section
    const roleMatch = content.match(/^#\s+(.+?)(?:\s+-\s+(.+))?$/m);
    const role = roleMatch?.[2] || null;
    const title = roleMatch?.[1] || null;

    return { role, title };
  } catch {
    return { role: null, title: null };
  }
}

async function parseAgentsMd(): Promise<Record<string, { skills: string[] }>> {
  try {
    const agentsPath = join(process.cwd(), '..', 'optimus', 'AGENTS.md');
    const content = await readFile(agentsPath, 'utf-8');

    // Parse agent skills from AGENTS.md
    const agents: Record<string, { skills: string[] }> = {};
    const agentMatches = content.matchAll(/##\s+(\w+)[\s\S]*?Skills:[\s\S]*?(-[\s\S]*?)(?=##|$)/g);

    for (const match of agentMatches) {
      const name = match[1].toLowerCase();
      const skillsText = match[2];
      const skills = skillsText
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.trim().replace(/^-\s*/, ''));

      agents[name] = { skills };
    }

    return agents;
  } catch {
    return {};
  }
}

async function getModelRouting(): Promise<Record<string, { model: string; provider: string; enabled: boolean }>> {
  try {
    const routingPath = join(process.cwd(), 'config', 'model-routing.json');
    const content = await readFile(routingPath, 'utf-8');
    const routing = JSON.parse(content);
    return routing.agents || {};
  } catch {
    return {};
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    // Get PM2 processes
    const pm2Processes = await getPM2Processes();

    // Get AGENTS.md data
    const agentsMdData = await parseAgentsMd();

    // Get model routing config
    const modelRouting = await getModelRouting();

    // Known agent names to check
    const knownAgents = ['optimus', 'henry', 'harvey', 'einstein', 'olivia', 'sophia', 'severino', 'prime'];

    // Build agent profiles
    const profiles: AgentProfile[] = [];

    for (const agentName of knownAgents) {
      // Find PM2 process for this agent
      const pm2Process = pm2Processes.find(p =>
        p.name?.toLowerCase().includes(agentName) ||
        p.pm2_env?.name?.toLowerCase().includes(agentName)
      );

      // Get SOUL.md data
      const soulData = await parseSoulMd(agentName);

      // Get model routing data
      const routing = modelRouting[agentName] || modelRouting[agentName.toLowerCase()];

      // Get skills from AGENTS.md
      const skills = agentsMdData[agentName]?.skills || agentsMdData[agentName.toLowerCase()]?.skills || [];

      // Build profile
      const profile: AgentProfile = {
        name: agentName,
        role: soulData.role,
        title: soulData.title,
        status: pm2Process?.pm2_env?.status || 'stopped',
        pid: pm2Process?.pid || null,
        uptime: pm2Process?.pm2_env?.pm_uptime
          ? Date.now() - pm2Process.pm2_env.pm_uptime
          : null,
        restarts: pm2Process?.pm2_env?.restart_time || 0,
        memory: pm2Process?.monit?.memory || null,
        model: routing?.model || null,
        provider: routing?.provider || null,
        routing_enabled: routing?.enabled ?? false,
        skills,
        is_live: pm2Process?.pm2_env?.status === 'online',
        last_heartbeat: pm2Process?.pm2_env?.pm_uptime
          ? new Date(pm2Process.pm2_env.pm_uptime).toISOString()
          : null,
      };

      profiles.push(profile);
    }

    return NextResponse.json({
      success: true,
      agents: profiles,
      count: profiles.length,
      live_count: profiles.filter(p => p.is_live).length,
      timestamp,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}
