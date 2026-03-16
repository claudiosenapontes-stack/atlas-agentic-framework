/**
 * ATLAS-AGENT-SKILLS-API
 * GET /api/agents/skills
 * 
 * Returns comprehensive agent information including:
 * - Identity (from SOUL.md)
 * - Tools configuration (from TOOLS.md)
 * - Runtime status (from PM2/OpenClaw)
 * - Installed vs available skills
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const SKILLS_DIR = '/usr/lib/node_modules/openclaw/skills';
const WORKSPACES_DIR = '/root/.openclaw/workspaces';

interface AgentSkillInfo {
  id: string;
  title: string;
  realm: string;
  emoji: string;
  soulConfigured: boolean;
  toolsConfigured: boolean;
  runtimeStatus: 'online' | 'offline' | 'unknown';
  pid?: number;
  uptime?: string;
  installedSkills: string[];
  availableSkills: number;
  suggestedSkills: string[];
  memoryFiles: number;
  lastSeen?: string;
}

// Core Atlas agents
const CORE_AGENTS = [
  'henry',
  'severino', 
  'olivia',
  'sophia',
  'harvey',
  'einstein',
  'optimus',
  'optimus-prime'
];

async function getAvailableSkills(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`ls -1 ${SKILLS_DIR}`);
    return stdout.split('\n').filter(s => s.trim() && !s.startsWith('.') && existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')));
  } catch {
    return [];
  }
}

async function getAgentSoulInfo(agentId: string): Promise<{ title: string; realm: string; emoji: string } | null> {
  try {
    const soulPath = path.join(WORKSPACES_DIR, agentId, 'SOUL.md');
    if (!existsSync(soulPath)) return null;
    
    const content = await readFile(soulPath, 'utf-8');
    
    // Extract title from first H1 or Name field
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/\*\*Name:\*\*\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : agentId;
    
    // Extract realm/role from role/domain/focus fields
    const realmMatch = content.match(/(?:role|domain|focus)[\s:]+([^\n]+)/i);
    const realm = realmMatch ? realmMatch[1].trim().split('.')[0] : 'Unconfigured';
    
    // Extract emoji if present (check common emoji patterns)
    const emojiMatch = content.match(/([🎭⚡🔧🧠💼📊🔍🤖💡🎯🔥💻])/);
    const emoji = emojiMatch ? emojiMatch[1] : '🤖';
    
    return { title, realm, emoji };
  } catch {
    return null;
  }
}

async function getInstalledSkills(agentId: string): Promise<string[]> {
  try {
    const toolsPath = path.join(WORKSPACES_DIR, agentId, 'TOOLS.md');
    if (!existsSync(toolsPath)) return [];
    
    const content = await readFile(toolsPath, 'utf-8');
    
    // Extract skill names from SKILL.md references
    const skills = new Set<string>();
    const skillRegex = /([a-z-]+)\/SKILL\.md/g;
    let match;
    while ((match = skillRegex.exec(content)) !== null) {
      skills.add(match[1]);
    }
    
    // Also check for skill references in text
    const availableSkills = await getAvailableSkills();
    for (const skill of availableSkills) {
      if (content.toLowerCase().includes(skill.toLowerCase())) {
        skills.add(skill);
      }
    }
    
    return Array.from(skills);
  } catch {
    return [];
  }
}

async function getMemoryFileCount(agentId: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`ls -1 ${path.join(WORKSPACES_DIR, agentId, 'memory')} 2>/dev/null | wc -l`);
    return parseInt(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function getRuntimeStatus(): Promise<Map<string, { status: string; pid?: number; uptime?: string }>> {
  const statusMap = new Map();
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    for (const proc of processes) {
      if (proc.name && CORE_AGENTS.some(a => proc.name.includes(a))) {
        statusMap.set(proc.name, {
          status: proc.pm2_env?.status || 'unknown',
          pid: proc.pid,
          uptime: proc.pm2_env?.pm_uptime ? formatUptime(Date.now() - proc.pm2_env.pm_uptime) : undefined
        });
      }
    }
  } catch {
    // PM2 not available
  }
  return statusMap;
}

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

function getSuggestedSkills(agentId: string, installed: string[], available: string[]): string[] {
  const roleSkillMap: Record<string, string[]> = {
    'henry': ['github', 'gh-issues', 'slack', 'discord', 'telegram'],
    'severino': ['healthcheck', 'mcporter', 'oracle', 'tmux', 'session-logs'],
    'olivia': ['github', 'notion', 'trello', 'slack', 'discord'],
    'sophia': ['weather', 'blogwatcher', 'gifgrep', 'slack', 'discord'],
    'harvey': ['github', 'oracle', 'pdf', 'session-logs'],
    'einstein': ['oracle', 'gemini', 'openai-whisper', 'pdf', 'video-frames'],
    'optimus': ['github', 'gh-issues', 'mcporter', 'coding-agent', 'skill-creator'],
    'optimus-prime': ['github', 'gh-issues', 'skill-creator', 'oracle', 'gemini']
  };
  
  const suggested = roleSkillMap[agentId] || ['github', 'oracle', 'session-logs'];
  return suggested.filter(s => !installed.includes(s) && available.includes(s)).slice(0, 3);
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const [availableSkills, runtimeStatus] = await Promise.all([
      getAvailableSkills(),
      getRuntimeStatus()
    ]);
    
    const agents: AgentSkillInfo[] = [];
    
    for (const agentId of CORE_AGENTS) {
      const soulInfo = await getAgentSoulInfo(agentId);
      const installedSkills = await getInstalledSkills(agentId);
      const memoryCount = await getMemoryFileCount(agentId);
      const runtime = runtimeStatus.get(agentId) || { status: 'unknown' };
      
      agents.push({
        id: agentId,
        title: soulInfo?.title || agentId,
        realm: soulInfo?.realm || 'Unconfigured',
        emoji: soulInfo?.emoji || '🤖',
        soulConfigured: !!soulInfo,
        toolsConfigured: existsSync(path.join(WORKSPACES_DIR, agentId, 'TOOLS.md')),
        runtimeStatus: runtime.status === 'online' ? 'online' : runtime.status === 'offline' ? 'offline' : 'unknown',
        pid: runtime.pid,
        uptime: runtime.uptime,
        installedSkills,
        availableSkills: availableSkills.length,
        suggestedSkills: getSuggestedSkills(agentId, installedSkills, availableSkills),
        memoryFiles: memoryCount
      });
    }
    
    return NextResponse.json({
      success: true,
      agents,
      availableSkills,
      skillsHubUrl: 'https://clawhub.com',
      timestamp
    });
  } catch (error) {
    console.error('[Agent Skills API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }, { status: 500 });
  }
}
