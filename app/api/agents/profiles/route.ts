/**
 * ATLAS-OPTIMUS-AGENT-PROFILE-SOURCE-FIX-9847
 * Agent Profiles API - SOUL.md as Single Source of Truth
 * 
 * Priority:
 * 1. SOUL.md (PRIMARY) - role, title, description, capabilities
 * 2. AGENTS.md (SECONDARY) - skills inventory
 * 3. NO FALLBACK DEFAULTS - null if missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AgentProfile {
  id: string;
  name: string;
  display_name: string;
  role: string | null;
  title: string | null;
  description: string | null;
  skills: string[];
  capabilities: string[];
  model: string | null;
  provider: string | null;
  status: 'active' | 'inactive' | 'degraded';
  routing_enabled: boolean;
  process_id?: number;
  uptime?: string;
  restart_count?: number;
  memory_mb?: number;
  last_config_update: string;
  is_live: boolean;
}

interface ParsedSoul {
  role: string | null;
  title: string | null;
  description: string | null;
  capabilities: string[];
}

// Core agent list - workspace mapping only, NO hardcoded metadata
const AGENT_WORKSPACES: Record<string, string> = {
  henry: 'henry',
  optimus: 'optimus',
  prime: 'optimus-prime',
  olivia: 'olivia',
  harvey: 'harvey',
  einstein: 'einstein',
  sophia: 'sophia',
  severino: 'severino',
};

/**
 * Parse SOUL.md to extract role, title, description, capabilities
 * Format: "_You're {name} — the {role}_"
 * Core Truths section contains capabilities
 */
function parseSoulMd(content: string): ParsedSoul {
  const result: ParsedSoul = {
    role: null,
    title: null,
    description: null,
    capabilities: [],
  };

  // Extract role from first line pattern: "_You're {name} — the {role}_"
  const roleMatch = content.match(/You're\s+\w+\s+[—-]\s+the\s+([^._]+)/i);
  if (roleMatch) {
    result.role = roleMatch[1].trim();
    result.title = result.role;
  }

  // Extract description from first paragraph after header
  const lines = content.split('\n');
  const headerEnd = lines.findIndex(l => l.startsWith('##'));
  if (headerEnd > 0) {
    const firstPara = lines.slice(0, headerEnd)
      .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('_'))
      .join(' ')
      .trim();
    if (firstPara) {
      result.description = firstPara.substring(0, 300);
    }
  }

  // Extract capabilities from Core Truths section
  const coreTruthsMatch = content.match(/## Core Truths\s*\n\n?([\s\S]*?)(?=\n## |\n# |$)/);
  if (coreTruthsMatch) {
    const coreTruthsSection = coreTruthsMatch[1];
    // Match bold headers followed by description
    const truthMatches = coreTruthsSection.match(/\*\*([^*]+)\*\*\s*\.\s*([^.]+)/g);
    if (truthMatches) {
      result.capabilities = truthMatches
        .map(t => t.replace(/\*\*/g, '').replace(/\.$/, '').trim())
        .slice(0, 5);
    }
  }

  return result;
}

/**
 * Parse AGENTS.md to extract skills
 */
function parseAgentsMd(content: string): string[] {
  const skills: string[] = [];
  
  // Look for skills/capabilities sections
  const skillsMatch = content.match(/(?:##|\*\*)\s*(?:Skills|Capabilities|Tools)[\s\S]*?(?=\n## |\n# |$)/i);
  if (skillsMatch) {
    // Extract list items or bold items
    const listItems = skillsMatch[0].match(/(?:^|\n)[\s]*[-*]\s*([^\n]+)/g);
    if (listItems) {
      return listItems
        .map(i => i.replace(/^\s*[-*]\s*/, '').trim())
        .filter(i => i.length > 0)
        .slice(0, 10);
    }
  }
  
  return skills;
}

/**
 * Get model from openclaw.json agents.list
 */
function getModelFromConfig(agentName: string): { model: string | null; provider: string | null } {
  try {
    const configPath = '/root/.openclaw/openclaw.json';
    if (!existsSync(configPath)) return { model: null, provider: null };
    
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agentConfig = config.agents?.list?.find((a: any) => a.id === agentName.toLowerCase());
    
    if (agentConfig?.model) {
      const model = agentConfig.model;
      const provider = model.includes('/') ? model.split('/')[0] : 'openrouter';
      return { model, provider };
    }
    
    // Fall back to default
    const defaultModel = config.agents?.defaults?.model?.primary;
    if (defaultModel) {
      const provider = defaultModel.includes('/') ? defaultModel.split('/')[0] : 'openrouter';
      return { model: defaultModel, provider };
    }
  } catch (e) {
    console.error(`[Agents] Failed to read config for ${agentName}:`, e);
  }
  return { model: null, provider: null };
}

/**
 * Check if agent is in openclaw.json routing config
 */
function isRoutingEnabled(agentName: string): boolean {
  try {
    const configPath = '/root/.openclaw/openclaw.json';
    if (!existsSync(configPath)) return false;
    
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agentList = config.agents?.list || [];
    return agentList.some((a: any) => a.id === agentName.toLowerCase());
  } catch (e) {
    return false;
  }
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

    const agents: AgentProfile[] = Object.entries(AGENT_WORKSPACES).map(([name, workspace]) => {
      // Find PM2 process for this agent
      const workerProcess = pm2Data.find((p: any) => 
        p.name === `worker-${name}` || p.name === `agent-${name}` || p.name === name
      );
      
      // Parse SOUL.md (PRIMARY source)
      let soulData: ParsedSoul = { role: null, title: null, description: null, capabilities: [] };
      try {
        const soulPath = join('/root/.openclaw/workspaces', workspace, 'SOUL.md');
        if (existsSync(soulPath)) {
          const soulContent = readFileSync(soulPath, 'utf-8');
          soulData = parseSoulMd(soulContent);
        }
      } catch (e) {
        console.error(`[Agents] Failed to parse SOUL.md for ${name}:`, e);
      }

      // Parse AGENTS.md (SECONDARY source for skills)
      let skills: string[] = [];
      try {
        const agentsPath = join('/root/.openclaw/workspaces', workspace, 'AGENTS.md');
        if (existsSync(agentsPath)) {
          const agentsContent = readFileSync(agentsPath, 'utf-8');
          skills = parseAgentsMd(agentsContent);
        }
      } catch (e) {
        // No AGENTS.md is OK
      }

      // Get model from openclaw.json
      const { model, provider } = getModelFromConfig(name);

      const isActive = !!workerProcess && workerProcess.pm2_env?.status === 'online';
      
      return {
        id: name,
        name,
        display_name: name.charAt(0).toUpperCase() + name.slice(1),
        role: soulData.role,
        title: soulData.title,
        description: soulData.description,
        skills: skills.length > 0 ? skills : [], // NO FALLBACK
        capabilities: soulData.capabilities.length > 0 ? soulData.capabilities : [], // NO FALLBACK
        model,
        provider,
        status: isActive ? 'active' : 'inactive',
        routing_enabled: isRoutingEnabled(name),
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
