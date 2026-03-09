"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, CheckCircle, Play, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface SpawnedAgent {
  id: string;
  name: string;
  displayName: string;
  status: "spawning" | "online" | "error";
  subtask?: string;
}

export function SwarmOrchestrator() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [agentCount, setAgentCount] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const [spawnedAgents, setSpawnedAgents] = useState<SpawnedAgent[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks");
        const data = await response.json();
        // Handle both direct array and {tasks: array} formats
        const tasksList = Array.isArray(data) ? data : data.tasks || [];
        setTasks(tasksList.filter((t: Task) => t.status === "inbox" || t.status === "in_progress"));
      } catch (e) {
        console.error("Failed to fetch tasks:", e);
      }
    };
    fetchTasks();
  }, []);

  const generateSubtasks = (taskTitle: string, count: number): string[] => {
    const subtasks: string[] = [];
    const chunks = [
      "Research and analyze requirements",
      "Design system architecture",
      "Implement core functionality",
      "Write unit tests",
      "Perform code review",
      "Optimize performance",
      "Document the solution",
      "Deploy to staging",
    ];
    
    for (let i = 0; i < count; i++) {
      subtasks.push(chunks[i % chunks.length] + ` (Part ${i + 1})`);
    }
    return subtasks;
  };

  const handleSpawnSwarm = async () => {
    if (!selectedTask) {
      setError("Please select a task");
      return;
    }

    setIsSpawning(true);
    setError(null);
    setSpawnedAgents([]);
    setCompletedCount(0);

    const task = tasks.find((t) => t.id === selectedTask);
    const subtasks = generateSubtasks(task?.title || "Task", agentCount);

    // Spawn agents in parallel
    const spawnPromises = subtasks.map(async (subtask, index) => {
      try {
        const response = await fetch("/api/agents/spawn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentType: "forge",
            agentName: `Swarm-${index + 1}`,
            taskId: selectedTask,
            context: { subtask, swarmIndex: index + 1, total: agentCount },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        const agent: SpawnedAgent = {
          id: data.agentId,
          name: data.name,
          displayName: data.displayName,
          status: "spawning",
          subtask,
        };

        setSpawnedAgents((prev) => [...prev, agent]);

        // Poll for online status
        const pollInterval = setInterval(async () => {
          try {
            const liveResponse = await fetch("/api/agents/live");
            const liveData = await liveResponse.json();
            const liveAgent = liveData.agents.find((a: any) => a.name === data.name);
            
            if (liveAgent && liveAgent.status === "online") {
              setSpawnedAgents((prev) =>
                prev.map((a) =>
                  a.name === data.name ? { ...a, status: "online" } : a
                )
              );
              setCompletedCount((c) => c + 1);
              clearInterval(pollInterval);
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 2000);

        // Stop polling after 15s
        setTimeout(() => clearInterval(pollInterval), 15000);

        return agent;
      } catch (err) {
        const errorAgent: SpawnedAgent = {
          id: `error-${index}`,
          name: `Swarm-${index + 1}`,
          displayName: `Swarm-${index + 1}`,
          status: "error",
          subtask,
        };
        setSpawnedAgents((prev) => [...prev, errorAgent]);
        return errorAgent;
      }
    });

    await Promise.all(spawnPromises);
    setIsSpawning(false);
  };

  const reset = () => {
    setSelectedTask("");
    setAgentCount(4);
    setSpawnedAgents([]);
    setCompletedCount(0);
    setError(null);
  };

  const onlineCount = spawnedAgents.filter((a) => a.status === "online").length;
  const errorCount = spawnedAgents.filter((a) => a.status === "error").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-purple-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Swarm Orchestrator</h3>
          <p className="text-xs text-gray-500">Parallel task execution with multiple agents</p>
        </div>
      </div>

      {spawnedAgents.length > 0 ? (
        <div className="space-y-4">
          {/* Progress */}
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-medium text-white">
                {onlineCount}/{spawnedAgents.length} Online
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${(onlineCount / spawnedAgents.length) * 100}%` }}
              />
            </div>
            {errorCount > 0 && (
              <p className="text-xs text-red-400 mt-2">
                {errorCount} agent{errorCount !== 1 ? "s" : ""} failed to spawn
              </p>
            )}
          </div>

          {/* Agent List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {spawnedAgents.map((agent) => (
              <div
                key={agent.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  agent.status === "online"
                    ? "bg-green-500/10 border-green-500/30"
                    : agent.status === "error"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                {agent.status === "online" ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : agent.status === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {agent.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{agent.subtask}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Start New Swarm
          </button>
        </div>
      ) : (
        <>
          {/* Task Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Select Task</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Choose a task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {tasks.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No available tasks</p>
            )}
          </div>

          {/* Agent Count */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Number of Agents: <span className="text-white font-medium">{agentCount}</span>
            </label>
            <input
              type="range"
              min={2}
              max={8}
              value={agentCount}
              onChange={(e) => setAgentCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2</span>
              <span>8</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSpawnSwarm}
            disabled={isSpawning || !selectedTask}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSpawning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Spawning Swarm...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Spawn {agentCount} Agents
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
