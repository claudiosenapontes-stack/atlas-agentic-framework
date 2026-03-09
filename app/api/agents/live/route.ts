import { NextRequest, NextResponse } from "next/server";
import { getRedisClient, getAllPresence } from "@/lib/redis";
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
}

async function getProcessList(): Promise<any[]> {
  try {
    // Use ps command to get process info
    const { stdout } = await execAsync(
      "ps aux | grep -E 'node.*agents' | grep -v grep || true"
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
        
        // Extract agent type from command
        const match = command.match(/agents\/(\w+)\/index\.js/);
        const agentType = match ? match[1] : 'unknown';
        
        processes.push({
          pid,
          cpu,
          memoryPercent: memory,
          command,
          agentType,
        });
      }
    }
    
    return processes;
  } catch (error) {
    console.error("[Live Agents] Failed to get process list:", error);
    return [];
  }
}

async function getProcessUptime(pid: number): Promise<number> {
  try {
    const { stdout } = await execAsync(`ps -o etimes= -p ${pid} 2>/dev/null || echo 0`);
    return parseInt(stdout.trim(), 10) * 1000; // Convert seconds to ms
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    // Get Redis presence data
    const presenceData = await getAllPresence();
    
    // Get real process data
    const processes = await getProcessList();

    // Get agents from Supabase
    const { data: dbAgents, error: dbError } = await supabase
      .from("agents")
      .select("id, name, display_name, role, status, pid")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("[Live Agents] Supabase error:", dbError);
    }

    // Merge data sources
    const agents: AgentMetrics[] = [];
    const processedNames = new Set<string>();

    // Process Redis presence data first (most accurate for status)
    for (const [agentName, presence] of Object.entries(presenceData)) {
      const dbAgent = dbAgents?.find((a: any) => a.name === agentName);
      const processInfo = processes.find((p) => p.pid === parseInt(presence.pid || '0', 10));
      
      // Calculate memory in bytes from percentage (assume 8GB system for rough estimate)
      const memoryBytes = processInfo ? processInfo.memoryPercent * 80 * 1024 * 1024 : 0;
      
      const uptime = presence.pid && presence.pid !== 'spawning' 
        ? await getProcessUptime(parseInt(presence.pid, 10))
        : 0;

      agents.push({
        pid: parseInt(presence.pid || '0', 10) || 0,
        name: agentName,
        displayName: dbAgent?.display_name || agentName,
        status: presence.status === "online" ? "online" : presence.status || "offline",
        cpu: processInfo?.cpu || 0,
        memory: memoryBytes,
        uptime: uptime,
        restarts: 0,
        currentTask: presence.current_task || dbAgent?.current_task || undefined,
        agentType: dbAgent?.role || presence.agent_type || "unknown",
        lastSeen: presence.last_seen || new Date().toISOString(),
      });
      
      processedNames.add(agentName);
    }

    // Add DB agents not in Redis (recently created or stale)
    for (const dbAgent of dbAgents || []) {
      if (!processedNames.has(dbAgent.name)) {
        const processInfo = processes.find((p) => p.pid === dbAgent.pid);
        
        agents.push({
          pid: dbAgent.pid || 0,
          name: dbAgent.name,
          displayName: dbAgent.display_name || dbAgent.name,
          status: dbAgent.status === "active" ? "online" : dbAgent.status || "offline",
          cpu: processInfo?.cpu || 0,
          memory: processInfo ? processInfo.memoryPercent * 80 * 1024 * 1024 : 0,
          uptime: dbAgent.pid ? await getProcessUptime(dbAgent.pid) : 0,
          restarts: 0,
          currentTask: undefined,
          agentType: dbAgent.role || "unknown",
          lastSeen: new Date().toISOString(),
        });
      }
    }

    // Sort by status (online first) then by name
    agents.sort((a, b) => {
      if (a.status === "online" && b.status !== "online") return -1;
      if (a.status !== "online" && b.status === "online") return 1;
      return b.pid - a.pid; // Most recent first
    });

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
      onlineCount: agents.filter((a: any) => a.status === "online").length,
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
