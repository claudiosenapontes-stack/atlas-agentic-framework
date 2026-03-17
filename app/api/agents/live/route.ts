/**
 * ATLAS-OPTIMUS-AGENT-PROFILE-SOURCE-FIX-9847
 * Live Agents API - SOUL.md as Single Source of Truth
 * 
 * Priority:
 * 1. SOUL.md (PRIMARY) - role, title, displayName
 * 2. Runtime data - status, pid, memory
 * 3. NO FALLBACK DEFAULTS - null if missing
 */

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";
import { supabase } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface AgentMetrics {
  pid: number;
  name: string;
  displayName: string | null;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  currentTask?: string;
  agentType: string | null;
  lastSeen: string;
  source: 'openclaw' | 'database' | 'process';
}

// Known agent workspace mappings only - NO hardcoded metadata
const AGENT_WORKSPACES: Record<string, string> = {
  henry: 'henry',
  harvey: 'harvey',
  einstein: 'einstein',
  sophia: 'sophia',
  severino: 'severino',
  olivia: 'olivia',
  optimus: 'optimus',
  prime: 'optimus-prime',
  'optimus-prime': 'optimus-prime',
  sentinel: 'sentinel',
  argus: 'argus',
  chronos: 'chronos',
  hermes: 'hermes',
  mercury: 'mercury',
  aegis: 'aegis',
  astra: 'astra',
  echo: 'echo',
};

/**
 * Parse SOUL.md to extract role/displayName
 * Format: "_You're {displayName} — the {role}_"
 */
function parseSoulRole(content: string): { displayName: string | null; role: string | null } {
  // Extract from pattern: "_You're Optimus — the Productivity Lead._"
  const match = content.match(/You're\s+(\w+)\s+[—-]\s+the\s+([^._\n]+)/i);
  if (match) {
    return {
      displayName: match[1].trim(),
      role: match[2].trim(),
    };
  }
  return { displayName: null, role: null };
}

async function getProcessList(): Promise<any[]> {
  try {
    const { stdout } = await execAsync(
      "ps aux | grep -E 'node.*agent' | grep -v grep || true"
    );
    
    const processes: any[] = [];
    const lines = stdout.trim().split('\n').filter(Boolean);
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        const pid = parseInt(parts[1], 10);
        const cpu = parseFloat(parts[2]) || 0;
        const memory = parseFloat(parts[3]) || 0;
        const command = parts.slice(10).join(' ');
        
        processes.push({ pid, cpu, memoryPercent: memory, command });
      }
    }
    
    return processes;
  } catch (error) {
    console.error("[Live Agents] Failed to get process list:", error);
    return [];
  }
}

export async function GET() {
  try {
    const openclaw = getOpenClawClient();
    const agents: AgentMetrics[] = [];
    const processedNames = new Set<string>();

    // 1. Get REAL data from OpenClaw Gateway
    let openclawConnected = false;
    try {
      const [activeAgents, cronJobs] = await Promise.all([
        openclaw.getActiveAgents(),
        openclaw.getCronJobs(),
      ]);

      openclawConnected = true;

      // Add active agents from OpenClaw sessions
      for (const agent of activeAgents) {
        const agentName = agent.id.toLowerCase();
        const workspace = AGENT_WORKSPACES[agentName];
        
        // Parse SOUL.md for role (PRIMARY source)
        let role: string | null = null;
        let displayName: string | null = null;
        if (workspace) {
          try {
            const soulPath = join('/root/.openclaw/workspaces', workspace, 'SOUL.md');
            if (existsSync(soulPath)) {
              const soulContent = readFileSync(soulPath, 'utf-8');
              const parsed = parseSoulRole(soulContent);
              role = parsed.role;
              displayName = parsed.displayName;
            }
          } catch (e) {
            console.error(`[Live Agents] Failed to parse SOUL.md for ${agentName}:`, e);
          }
        }

        agents.push({
          pid: 0,
          name: agent.id,
          displayName: displayName || agent.name,
          status: agent.status,
          cpu: 0,
          memory: 0,
          uptime: 0,
          restarts: 0,
          currentTask: agent.currentTask,
          agentType: role,
          lastSeen: agent.lastSeen || new Date().toISOString(),
          source: 'openclaw',
        });
        processedNames.add(agentName);
      }

      // Add cron jobs as "scheduled tasks" for agents
      for (const job of cronJobs) {
        const agentName = job.agentId || 'system';
        const agentKey = agentName.toLowerCase();
        if (!processedNames.has(agentKey) && agentName !== 'main') {
          const workspace = AGENT_WORKSPACES[agentKey];
          
          // Parse SOUL.md for role
          let role: string | null = null;
          let displayName: string | null = null;
          if (workspace) {
            try {
              const soulPath = join('/root/.openclaw/workspaces', workspace, 'SOUL.md');
              if (existsSync(soulPath)) {
                const soulContent = readFileSync(soulPath, 'utf-8');
                const parsed = parseSoulRole(soulContent);
                role = parsed.role;
                displayName = parsed.displayName;
              }
            } catch (e) {
              console.error(`[Live Agents] Failed to parse SOUL.md for ${agentName}:`, e);
            }
          }
          
          if (role || displayName) {
            agents.push({
              pid: 0,
              name: agentName,
              displayName: displayName || agentName,
              status: 'scheduled',
              cpu: 0,
              memory: 0,
              uptime: 0,
              restarts: 0,
              currentTask: job.name,
              agentType: role,
              lastSeen: job.state?.lastRunAt 
                ? new Date(job.state.lastRunAt).toISOString()
                : new Date().toISOString(),
              source: 'openclaw',
            });
            processedNames.add(agentKey);
          }
        }
      }
    } catch (error) {
      console.log('[Live Agents] OpenClaw not connected, falling back to database');
    }

    // 2. Get agents from Supabase database
    const { data: dbAgents, error: dbError } = await supabase
      .from("agents")
      .select("id, name, display_name, role, status")
      .order("created_at", { ascending: false });

    if (!dbError && dbAgents) {
      for (const dbAgent of dbAgents) {
        const agentKey = dbAgent.name.toLowerCase();
        if (!processedNames.has(agentKey)) {
          const workspace = AGENT_WORKSPACES[agentKey];
          
          // Parse SOUL.md for role (PRIMARY over database)
          let role: string | null = dbAgent.role;
          let displayName: string | null = dbAgent.display_name;
          if (workspace) {
            try {
              const soulPath = join('/root/.openclaw/workspaces', workspace, 'SOUL.md');
              if (existsSync(soulPath)) {
                const soulContent = readFileSync(soulPath, 'utf-8');
                const parsed = parseSoulRole(soulContent);
                if (parsed.role) role = parsed.role;
                if (parsed.displayName) displayName = parsed.displayName;
              }
            } catch (e) {
              // Keep database values if SOUL.md fails
            }
          }

          agents.push({
            pid: 0,
            name: dbAgent.name,
            displayName: displayName,
            status: dbAgent.status === "active" ? "online" : dbAgent.status || "offline",
            cpu: 0,
            memory: 0,
            uptime: 0,
            restarts: 0,
            currentTask: undefined,
            agentType: role,
            lastSeen: new Date().toISOString(),
            source: 'database',
          });
          processedNames.add(agentKey);
        }
      }
    }

    // 3. Get process info for running agents
    const processes = await getProcessList();
    for (const agent of agents) {
      const proc = processes.find(p => 
        p.command.toLowerCase().includes(agent.name.toLowerCase())
      );
      if (proc) {
        agent.pid = proc.pid;
        agent.cpu = proc.cpu;
        agent.memory = proc.memoryPercent * 80 * 1024 * 1024; // Rough estimate
        agent.source = 'process';
      }
    }

    // Sort: online first, then by name
    agents.sort((a, b) => {
      const statusOrder = { online: 0, scheduled: 1, busy: 2, offline: 3 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
      onlineCount: agents.filter(a => a.status === "online").length,
      openclawConnected,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Live Agents] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", agents: [] },
      { status: 500 }
    );
  }
}
