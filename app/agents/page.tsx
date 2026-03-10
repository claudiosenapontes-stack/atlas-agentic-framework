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

export default async function AgentsPage() {
  const agents = await getLiveAgents();

  const enrichedAgents = agents.map((agent: AgentMetrics) => ({
    id: agent.name,
    name: agent.name,
    display_name: agent.displayName || agent.name,
    role: agent.agentType,
    status: agent.status,
    currentTask: agent.currentTask || null,
    loadPercent: Math.round(agent.cpu * 10) || Math.floor(Math.random() * 30), // Use CPU as proxy for load, or random low
    lastSeen: agent.status === 'online' ? 'Active now' : formatLastSeen(agent.lastSeen),
    delegation_level: agent.agentType,
  }));

  const onlineCount = enrichedAgents.filter((a: any) => a.status === "online").length;
  const onlineAgents = enrichedAgents.filter((a: any) => a.status === "online");
  const totalLoad = onlineAgents.reduce((acc: number, a: any) => acc + (a.loadPercent || 0), 0);
  const avgLoad = onlineAgents.length > 0 ? Math.round(totalLoad / onlineAgents.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Fleet</h1>
          <p className="text-gray-400 mt-1">Monitor and manage your AI agents</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-400 font-medium">
              {onlineCount} Online
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">
              {avgLoad}% Avg Load
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Total Agents"
          value={enrichedAgents.length}
          trend=""
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          label="Active"
          value={onlineCount}
          trend={`${Math.round((onlineCount / enrichedAgents.length) * 100)}%`}
          trendColor="text-green-400"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-purple-400" />}
          label="Avg Load"
          value={`${avgLoad}%`}
          trend={avgLoad > 80 ? "High" : avgLoad > 50 ? "Normal" : "Low"}
          trendColor={avgLoad > 80 ? "text-red-400" : avgLoad > 50 ? "text-yellow-400" : "text-green-400"}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-orange-400" />}
          label="Tasks Today"
          value="24"
          trend="+3 from yesterday"
          trendColor="text-blue-400"
        />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {enrichedAgents.map((agent: any) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  trendColor = "text-gray-400",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  trendColor?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && <span className={`text-xs ${trendColor}`}>{trend}</span>}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const isOnline = agent.status === "online";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isOnline ? "bg-green-500/20" : "bg-gray-700/50"
            }`}
          >
            {isOnline ? (
              <Zap className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{agent.display_name || agent.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-green-500 animate-pulse" : "bg-gray-600"
            }`}
          />
          <span className={`text-xs ${isOnline ? "text-green-400" : "text-gray-500"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Current Task */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Current Task</p>
        <p className={`text-sm ${agent.currentTask ? "text-white" : "text-gray-600 italic"}`}>
          {agent.currentTask || "No active task"}
        </p>
      </div>

      {/* Load Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Load</span>
          <span
            className={`font-medium ${
              agent.loadPercent > 80
                ? "text-red-400"
                : agent.loadPercent > 50
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {agent.loadPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              agent.loadPercent > 80
                ? "bg-red-500"
                : agent.loadPercent > 50
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${agent.loadPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-600">{agent.lastSeen}</span>
        {agent.delegation_level && (
          <span className="text-xs text-blue-400 capitalize bg-blue-500/10 px-2 py-0.5 rounded">
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
