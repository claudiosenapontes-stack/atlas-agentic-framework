"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, CheckCircle, Bot, Code, BarChart3, Search, Shield, Rocket } from "lucide-react";

interface AgentType {
  key: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: React.ReactNode;
  color: string;
}

const AGENT_TYPES: AgentType[] = [
  {
    key: "forge",
    name: "Forge",
    description: "Code generation and implementation specialist",
    capabilities: ["coding", "architecture", "refactoring"],
    icon: <Code className="w-5 h-5" />,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  },
  {
    key: "vector",
    name: "Vector",
    description: "Data analysis and visualization expert",
    capabilities: ["analytics", "charts", "reporting"],
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  },
  {
    key: "scout",
    name: "Scout",
    description: "Research and reconnaissance agent",
    capabilities: ["web_search", "data_gathering", "monitoring"],
    icon: <Search className="w-5 h-5" />,
    color: "text-green-400 bg-green-500/10 border-green-500/30",
  },
  {
    key: "guard",
    name: "Guard",
    description: "Security and validation specialist",
    capabilities: ["security", "testing", "validation"],
    icon: <Shield className="w-5 h-5" />,
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  {
    key: "flux",
    name: "Flux",
    description: "DevOps and deployment automation",
    capabilities: ["deployment", "infrastructure", "ci_cd"],
    icon: <Rocket className="w-5 h-5" />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
];

interface SpawnResult {
  agentId: string;
  name: string;
  displayName: string;
  status: string;
}

export function SwarmController() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AgentType | null>(null);
  const [agentName, setAgentName] = useState("");
  const [taskId, setTaskId] = useState("");
  const [isSpawning, setIsSpawning] = useState(false);
  const [spawnResult, setSpawnResult] = useState<SpawnResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSpawn = async () => {
    if (!selectedType) return;

    setIsSpawning(true);
    setError(null);
    setSpawnResult(null);

    try {
      const response = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedType.key,
          agentName: agentName.trim() || undefined,
          taskId: taskId.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to spawn agent");
      }

      setSpawnResult(data);

      // Poll for status update
      const pollInterval = setInterval(async () => {
        try {
          const liveResponse = await fetch("/api/agents/live");
          const liveData = await liveResponse.json();
          
          const agent = liveData.agents.find((a: any) => a.name === data.name);
          if (agent && agent.status === "online") {
            setSpawnResult((prev) => prev ? { ...prev, status: "online" } : prev);
            clearInterval(pollInterval);
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 2000);

      // Clear poll after 10s
      setTimeout(() => clearInterval(pollInterval), 10000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSpawning(false);
    }
  };

  const reset = () => {
    setSelectedType(null);
    setAgentName("");
    setTaskId("");
    setSpawnResult(null);
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Spawn Agent
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          Spawn Agent
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            reset();
          }}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {spawnResult ? (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            spawnResult.status === "online" 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}>
            <div className="flex items-center gap-3">
              {spawnResult.status === "online" ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              )}
              <div>
                <p className="font-medium text-white">
                  {spawnResult.status === "online" ? "Agent Online!" : "Spawning..."}
                </p>
                <p className="text-sm text-gray-400">
                  {spawnResult.displayName} ({spawnResult.name})
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Spawn Another
          </button>
        </div>
      ) : (
        <>
          {/* Agent Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedType?.key === type.key
                    ? `${type.color} ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500`
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className={`${type.color.split(" ")[0]} mb-2`}>{type.icon}</div>
                <p className="font-medium text-white">{type.name}</p>
                <p className="text-xs text-gray-400 mt-1">{type.description}</p>
              </button>
            ))}
          </div>

          {/* Configuration */}
          {selectedType && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Agent Name (optional)</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`${selectedType.name}-001`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Task ID (optional)</label>
                <input
                  type="text"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  placeholder="Assign to task..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSpawn}
            disabled={!selectedType || isSpawning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSpawning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Spawning...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Spawn {selectedType?.name || "Agent"}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
