import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";
import { supabase } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface AgentMetrics {
  pid: number;
  name: string;
  displayName: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  currentTask?: string;
  agentType: string;
  lastSeen: string;
  source: 'openclaw' | 'database' | 'process';
}

// Known agent configurations from OpenClaw
const AGENT_CONFIG: Record<string, { displayName: string; role: string; emoji: string }> = {
  henry: { displayName: "Henry", role: "CEO", emoji: "👔" },
  harvey: { displayName: "Harvey", role: "Finance", emoji: "💰" },
  einstein: { displayName: "Einstein", role: "Research", emoji: "🔬" },
  sophia: { displayName: "Sophia", role: "Marketing", emoji: "📈" },
  severino: { displayName: "Severino", role: "Operations", emoji: "⚙️" },
  olivia: { displayName: "Olivia", role: "Executive Assistant", emoji: "🗂️" },
  optimus: { displayName: "Optimus", role: "Tech Lead", emoji: "🧰" },
  prime: { displayName: "Prime", role: "Senior Dev", emoji: "🏗️" },
  "optimus-prime": { displayName: "Prime", role: "Senior Dev", emoji: "🏗️" },
  sentinel: { displayName: "Sentinel", role: "Monitoring", emoji: "👁️" },
  argus: { displayName: "Argus", role: "Security", emoji: "🛡️" },
  chronos: { displayName: "Chronos", role: "Scheduler", emoji: "⏰" },
  hermes: { displayName: "Hermes", role: "Messaging", emoji: "📨" },
  mercury: { displayName: "Mercury", role: "Speed", emoji: "⚡" },
  aegis: { displayName: "Aegis", role: "Protection", emoji: "🛡️" },
  astra: { displayName: "Astra", role: "Analytics", emoji: "⭐" },
  echo: { displayName: "Echo", role: "Communication", emoji: "📢" },
};

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
        const config = AGENT_CONFIG[agent.id.toLowerCase()] || { 
          displayName: agent.name, 
          role: agent.id,
          emoji: "🤖"
        };

        agents.push({
          pid: 0,
          name: agent.id,
          displayName: config.displayName,
          status: agent.status,
          cpu: 0,
          memory: 0,
          uptime: 0,
          restarts: 0,
          currentTask: agent.currentTask,
          agentType: config.role,
          lastSeen: agent.lastSeen || new Date().toISOString(),
          source: 'openclaw',
        });
        processedNames.add(agent.id.toLowerCase());
      }

      // Add cron jobs as "scheduled tasks" for agents
      for (const job of cronJobs) {
        const agentName = job.agentId || 'system';
        if (!processedNames.has(agentName.toLowerCase()) && agentName !== 'main') {
          const config = AGENT_CONFIG[agentName.toLowerCase()];
          if (config) {
            agents.push({
              pid: 0,
              name: agentName,
              displayName: config.displayName,
              status: 'scheduled',
              cpu: 0,
              memory: 0,
              uptime: 0,
              restarts: 0,
              currentTask: job.name,
              agentType: config.role,
              lastSeen: job.state?.lastRunAt 
                ? new Date(job.state.lastRunAt).toISOString()
                : new Date().toISOString(),
              source: 'openclaw',
            });
            processedNames.add(agentName.toLowerCase());
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
          const config = AGENT_CONFIG[agentKey] || { 
            displayName: dbAgent.display_name || dbAgent.name, 
            role: dbAgent.role || "Agent",
            emoji: "🤖"
          };

          agents.push({
            pid: 0,
            name: dbAgent.name,
            displayName: config.displayName,
            status: dbAgent.status === "active" ? "online" : dbAgent.status || "offline",
            cpu: 0,
            memory: 0,
            uptime: 0,
            restarts: 0,
            currentTask: undefined,
            agentType: config.role,
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
