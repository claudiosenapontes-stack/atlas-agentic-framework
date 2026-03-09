"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Shield, 
  Power,
  Clock,
  AlertOctagon
} from "lucide-react";

interface HealingEvent {
  id: string;
  agentName: string;
  agentType: string;
  event: string;
  reason: string;
  timestamp: string;
  autoHealed: boolean;
  restartCount: number;
}

interface AgentStat {
  name: string;
  type: string;
  restarts: number;
  lastCrash: string | null;
  autoHealed: number;
  alerts: number;
}

interface AutoHealSettings {
  [key: string]: boolean;
}

export function SelfHealingMonitor() {
  const [events, setEvents] = useState<HealingEvent[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [criticalAgents, setCriticalAgents] = useState<AgentStat[]>([]);
  const [settings, setSettings] = useState<AutoHealSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/agents/self-heal");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setEvents(data.events);
      setAgentStats(data.agentStats);
      setCriticalAgents(data.criticalAgents);
      setSettings(data.autoHealSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutoHeal = async (agentType: string) => {
    const newValue = !settings[agentType];
    
    try {
      const response = await fetch("/api/agents/self-heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, enabled: newValue }),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, [agentType]: newValue }));
      }
    } catch (err) {
      console.error("Failed to toggle auto-heal:", err);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getEventIcon = (event: string, autoHealed: boolean) => {
    if (event === "restart") {
      return autoHealed ? (
        <CheckCircle className="w-4 h-4 text-green-400" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
      );
    }
    return <AlertOctagon className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="font-semibold text-white">Self-Healing Monitor</h3>
            <p className="text-xs text-gray-500">
              {criticalAgents.length > 0 ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {criticalAgents.length} agent{criticalAgents.length !== 1 ? "s" : ""} need attention
                </span>
              ) : (
                "All agents healthy"
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Critical Alerts */}
      {criticalAgents.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-red-500/10 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertOctagon className="w-4 h-4" />
            <span className="text-sm font-medium">
              Critical: {criticalAgents.map((a) => a.name).join(", ")} restarted &gt;3 times in 1 hour
            </span>
          </div>
        </div>
      )}

      {/* Agent Stats Table */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Agent Status</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pb-2 font-medium">Agent</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Restarts (1h)</th>
                <th className="pb-2 font-medium">Last Crash</th>
                <th className="pb-2 font-medium">Auto-Healed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {agentStats.map((agent) => (
                <tr key={agent.name} className="group">
                  <td className="py-3">
                    <span className="text-white font-medium">{agent.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({agent.type})</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        agent.restarts > 3
                          ? "bg-red-500/20 text-red-400"
                          : agent.restarts > 0
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {agent.restarts > 3 ? (
                        <AlertOctagon className="w-3 h-3" />
                      ) : agent.restarts > 0 ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {agent.restarts > 3 ? "Critical" : agent.restarts > 0 ? "Warning" : "Healthy"}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`font-mono ${
                        agent.restarts > 3 ? "text-red-400" : "text-gray-300"
                      }`}
                    >
                      {agent.restarts}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {agent.lastCrash ? formatTime(agent.lastCrash) : "—"}
                  </td>
                  <td className="py-3">
                    <span className="text-green-400">{agent.autoHealed}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Heal Settings */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Auto-Heal Settings</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(settings).map(([agentType, enabled]) => (
            <button
              key={agentType}
              onClick={() => toggleAutoHeal(agentType)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                enabled
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-gray-800 border-gray-700 text-gray-400"
              }`}
            >
              <Power className={`w-4 h-4 ${enabled ? "" : "text-gray-600"}`} />
              <span className="text-sm capitalize">{agentType}</span>
              <span className="text-xs opacity-70">{enabled ? "ON" : "OFF"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Healing Log */}
      <div className="px-4 sm:px-6 py-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Auto-Heal Log</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No healing events</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-lg bg-gray-800/50"
              >
                {getEventIcon(event.event, event.autoHealed)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    {event.agentName}{" "}
                    <span className="text-gray-400">
                      {event.event === "restart" ? "restarted" : "alert"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">{event.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                  {event.autoHealed && (
                    <span className="block text-xs text-green-400">Auto-healed</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
