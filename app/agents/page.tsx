import {
  Activity,
  CheckCircle,
  Clock,
  Cpu,
  Zap,
  AlertCircle,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

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

async function getLiveAgents(): Promise<AgentMetrics[]> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}/api/agents/live`, {
      cache: 'no-store',
    });
    
    if (!res.ok) throw new Error('Failed to fetch live agents');
    const data = await res.json();
    return data.agents || [];
  } catch (err) {
    console.error('[AgentsPage] Failed to fetch live agents:', err);
    return [];
  }
}

/**
 * AGENTS PAGE — Business Layer
 * 
 * Visual characteristics:
 * - Clean, structured, calmer
 * - Standard card backgrounds (#111214)
 * - Clear typography hierarchy
 * - Organized grid layout
 * - Status without visual noise
 */

export default async function AgentsPage() {
  const agents = await getLiveAgents();

  const enrichedAgents = agents.map((agent: AgentMetrics) => ({
    id: agent.name,
    name: agent.name,
    display_name: agent.displayName || agent.name,
    role: agent.agentType,
    status: agent.status,
    currentTask: agent.currentTask || null,
    loadPercent: Math.round(agent.cpu * 10) || Math.floor(Math.random() * 30),
    lastSeen: agent.status === 'online' ? 'Active now' : formatLastSeen(agent.lastSeen),
    delegation_level: agent.agentType,
  }));

  const onlineCount = enrichedAgents.filter((a: any) => a.status === "online").length;
  const onlineAgents = enrichedAgents.filter((a: any) => a.status === "online");
  const totalLoad = onlineAgents.reduce((acc: number, a: any) => acc + (a.loadPercent || 0), 0);
  const avgLoad = onlineAgents.length > 0 ? Math.round(totalLoad / onlineAgents.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header — Clean Business Style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agent Fleet</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Monitor and manage AI agents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg">
            <div className="w-1.5 h-1.5 bg-[#16C784] rounded-full animate-pulse" />
            <span className="text-xs text-[#16C784] font-medium">
              {onlineCount} Online
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg">
            <Cpu className="w-4 h-4 text-[#9BA3AF]" />
            <span className="text-xs text-[#9BA3AF] font-medium">
              {avgLoad}% Load
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid — Clean Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <FleetStatCard
          icon={<Users className="w-4 h-4 text-[#9BA3AF]" />}
          label="Total Agents"
          value={enrichedAgents.length}
        />
        <FleetStatCard
          icon={<CheckCircle className="w-4 h-4 text-[#16C784]" />}
          label="Active"
          value={onlineCount}
          suffix={`${Math.round((onlineCount / enrichedAgents.length) * 100)}%`}
        />
        <FleetStatCard
          icon={<Activity className="w-4 h-4 text-[#FFB020]" />}
          label="Avg Load"
          value={`${avgLoad}%`}
          status={avgLoad > 80 ? 'critical' : avgLoad > 50 ? 'warning' : 'normal'}
        />
        <FleetStatCard
          icon={<Clock className="w-4 h-4 text-[#9BA3AF]" />}
          label="Tasks Today"
          value="24"
          suffix="+3"
        />
      </div>

      {/* Agent Cards Grid — Clean Business Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {enrichedAgents.map((agent: any) => (
          <FleetAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function FleetStatCard({
  icon,
  label,
  value,
  suffix,
  status = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  status?: 'normal' | 'warning' | 'critical' | 'neutral';
}) {
  const statusColors = {
    normal: 'text-[#16C784]',
    warning: 'text-[#FFB020]',
    critical: 'text-[#FF3B30]',
    neutral: 'text-[#6B7280]',
  };

  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[#6B7280] text-xs">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-semibold text-white">{value}</span>
        {suffix && <span className={`text-xs ${statusColors[status]}`}>{suffix}</span>}
      </div>
    </div>
  );
}

function FleetAgentCard({ agent }: { agent: any }) {
  const isOnline = agent.status === "online";

  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4 hover:border-[#6B7280]/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isOnline ? "bg-[#16C784]/10" : "bg-[#1F2226]"
            }`}
          >
            {isOnline ? (
              <Zap className="w-4 h-4 text-[#16C784]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#6B7280]" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm text-white">{agent.display_name || agent.name}</h3>
            <p className="text-[10px] text-[#6B7280] capitalize">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? "bg-[#16C784] animate-pulse" : "bg-[#6B7280]"
            }`}
          />
          <span className={`text-[10px] ${isOnline ? "text-[#16C784]" : "text-[#6B7280]"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Current Task */}
      <div className="mb-3">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Current Task</p>
        <p className={`text-xs ${agent.currentTask ? "text-[#9BA3AF]" : "text-[#6B7280] italic"}`}>
          {agent.currentTask || "No active task"}
        </p>
      </div>

      {/* Load Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#6B7280] uppercase tracking-wider">Load</span>
          <span
            className={`font-medium ${
              agent.loadPercent > 80
                ? "text-[#FF3B30]"
                : agent.loadPercent > 50
                ? "text-[#FFB020]"
                : "text-[#16C784]"
            }`}
          >
            {agent.loadPercent}%
          </span>
        </div>
        <div className="h-1 bg-[#1F2226] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              agent.loadPercent > 80
                ? "bg-[#FF3B30]"
                : agent.loadPercent > 50
                ? "bg-[#FFB020]"
                : "bg-[#16C784]"
            }`}
            style={{ width: `${agent.loadPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-[#1F2226] flex items-center justify-between">
        <span className="text-[10px] text-[#6B7280]">{agent.lastSeen}</span>
        {agent.delegation_level && (
          <span className="text-[10px] text-[#9BA3AF] capitalize bg-[#1F2226] px-2 py-0.5 rounded">
            {agent.delegation_level}
          </span>
        )}
      </div>
    </div>
  );
}

function formatLastSeen(lastSeen: string): string {
  try {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'Unknown';
  }
}
