"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Cpu, MemoryStick, Clock, Power, AlertTriangle, Bot } from "lucide-react";

interface Agent {
  pid?: number;
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

export function LiveAgentMonitor() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [killingAgent, setKillingAgent] = useState<string | null>(null);
  const [confirmKill, setConfirmKill] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/agents/live", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data = await response.json();
      setAgents(data.agents || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const handleKill = async (agentName: string) => {
    if (confirmKill !== agentName) {
      setConfirmKill(agentName);
      return;
    }

    setKillingAgent(agentName);
    setConfirmKill(null);

    try {
      // Call real kill API
      const response = await fetch("/api/agents/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to kill agent");
      }
      
      // Mark as stopping in UI
      setAgents((prev) =>
        prev.map((a) =>
          a.name === agentName ? { ...a, status: "stopping" } : a
        )
      );

      // Remove from list after delay
      setTimeout(() => {
        setAgents((prev) => prev.filter((a) => a.name !== agentName));
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to kill agent");
    } finally {
      setKillingAgent(null);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatMemory = (bytes: number) => {
    const mb = Math.round(bytes / 1024 / 1024);
    return `${mb} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "spawning":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "stopping":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const onlineCount = agents.filter((a) => a.status === "online").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">Live Agent Monitor</h3>
            <p className="text-xs text-gray-500">
              {onlineCount} online • Refreshed {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAgents}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Agent List */}
      <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
        {isLoading && agents.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No agents running</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.name}
              className="px-6 py-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name & Status */}
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white truncate">
                      {agent.displayName}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(
                        agent.status
                      )}`}
                    >
                      {agent.status}
                    </span>
                    {agent.restarts > 0 && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {agent.restarts} restart{agent.restarts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Current Task */}
                  {agent.currentTask && (
                    <p className="text-sm text-gray-400 mb-2 truncate">
                      Task: {agent.currentTask}
                    </p>
                  )}

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className={agent.cpu > 50 ? "text-yellow-400" : ""}>
                        {agent.cpu}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MemoryStick className="w-3.5 h-3.5" />
                      <span>{formatMemory(agent.memory)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatUptime(agent.uptime)}</span>
                    </div>
                  </div>
                </div>

                {/* Kill Button */}
                <button
                  onClick={() => handleKill(agent.name)}
                  disabled={killingAgent === agent.name || agent.status !== "online"}
                  className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    confirmKill === agent.name
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400"
                  } ${killingAgent === agent.name ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {killingAgent === agent.name ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : confirmKill === agent.name ? (
                    "Confirm?"
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Auto-refresh: 10s</span>
          <span>{agents.length} total agents</span>
        </div>
      </div>
    </div>
  );
}
