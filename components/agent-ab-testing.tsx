"use client";

import { useState } from "react";
import {
  Beaker,
  GitCompare,
  Play,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Target,
} from "lucide-react";

interface AgentVersion {
  id: string;
  name: string;
  version: string;
}

interface ABTestMetrics {
  completionTime: number;
  success: boolean;
  errorCount: number;
  outputQuality: number;
}

interface ABTestEntry {
  id: string;
  agentA: AgentVersion;
  agentB: AgentVersion;
  taskName: string;
  status: "running" | "completed" | "failed";
  metrics?: {
    agentA: ABTestMetrics;
    agentB: ABTestMetrics;
  };
  winner?: "A" | "B" | "tie";
  startedAt: string;
}

const AGENTS: AgentVersion[] = [
  { id: "forge-v1", name: "FORGE", version: "v1" },
  { id: "forge-v2", name: "FORGE", version: "v2" },
  { id: "vector-v1", name: "VECTOR", version: "v1" },
  { id: "vector-v2", name: "VECTOR", version: "v2" },
  { id: "vector-v3", name: "VECTOR", version: "v3" },
  { id: "sentinel-v1", name: "SENTINEL", version: "v1" },
];

const TASKS = [
  { id: "task-1", name: "Generate React Component" },
  { id: "task-2", name: "Vector Search Query" },
  { id: "task-3", name: "Monitor Services" },
  { id: "task-4", name: "Process API Request" },
];

const BASE_RESULTS: ABTestEntry[] = [
  {
    id: "test-1",
    agentA: { id: "forge-v1", name: "FORGE", version: "v1" },
    agentB: { id: "forge-v2", name: "FORGE", version: "v2" },
    taskName: "Generate React Component",
    status: "completed",
    winner: "B",
    startedAt: "2026-03-08T09:30:00Z",
    metrics: {
      agentA: { completionTime: 2.3, success: true, errorCount: 1, outputQuality: 76 },
      agentB: { completionTime: 1.4, success: true, errorCount: 0, outputQuality: 89 },
    },
  },
  {
    id: "test-2",
    agentA: { id: "vector-v2", name: "VECTOR", version: "v2" },
    agentB: { id: "vector-v3", name: "VECTOR", version: "v3" },
    taskName: "Vector Search Query",
    status: "completed",
    winner: "B",
    startedAt: "2026-03-08T11:00:00Z",
    metrics: {
      agentA: { completionTime: 1.8, success: true, errorCount: 0, outputQuality: 85 },
      agentB: { completionTime: 1.1, success: true, errorCount: 0, outputQuality: 92 },
    },
  },
];

export function AgentABTesting() {
  const [agentA, setAgentA] = useState<string>("");
  const [agentB, setAgentB] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [tests, setTests] = useState<ABTestEntry[]>(BASE_RESULTS);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    if (!agentA || !agentB || !taskId) {
      setStatus("Select both agents and a task.");
      return;
    }
    if (agentA === agentB) {
      setStatus("Choose two different versions.");
      return;
    }

    const agentAData = AGENTS.find((a) => a.id === agentA)!;
    const agentBData = AGENTS.find((a) => a.id === agentB)!;
    const task = TASKS.find((t) => t.id === taskId)!;

    const newTest: ABTestEntry = {
      id: `test-${Date.now()}`,
      agentA: agentAData,
      agentB: agentBData,
      taskName: task.name,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    setTests((prev) => [newTest, ...prev]);
    setRunning(true);
    setStatus("Running test...");

    try {
      const res = await fetch("/api/agents/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, agentTypeA: agentA, agentTypeB: agentB }),
      });

      if (!res.ok) throw new Error("Test failed");
      const data = await res.json();

      setTests((prev) =>
        prev.map((test) =>
          test.id === newTest.id
            ? {
                ...test,
                status: "completed",
                winner: data.winner,
                metrics: data,
              }
            : test
        )
      );
      setStatus(data.winner === "tie" ? "Tie" : `Winner: ${data.winner}`);
    } catch (err) {
      setTests((prev) => prev.map((test) => (test.id === newTest.id ? { ...test, status: "failed" } : test)));
      setStatus("Test failed.");
    } finally {
      setRunning(false);
    }
  };

  const declareWinner = (id: string, winner: "A" | "B" | "tie") => {
    setTests((prev) =>
      prev.map((test) =>
        test.id === id
          ? {
              ...test,
              winner,
              status: "completed",
            }
          : test
      )
    );
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="w-6 h-6 text-purple-500" /> A/B Testing
          </h2>
          <p className="text-sm text-slate-400">Compare two agent versions on the same task.</p>
        </div>
        <span className="text-sm text-slate-400">Tests run: {tests.length}</span>
      </header>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-slate-300">Agent A (Control)</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              value={agentA}
              onChange={(e) => setAgentA(e.target.value)}
            >
              <option value="">Select agent</option>
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.version}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">Agent B (Variant)</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              value={agentB}
              onChange={(e) => setAgentB(e.target.value)}
            >
              <option value="">Select agent</option>
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.version}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">Task</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">Select task</option>
              {TASKS.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-60"
          onClick={runTest}
          disabled={running}
        >
          <Play className="mr-2 inline h-4 w-4" /> Run A/B Test
        </button>

        {status && <p className="text-sm text-slate-400">{status}</p>}
      </div>

      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-purple-400" />
                <span className="font-semibold text-white">
                  {test.agentA.name} {test.agentA.version} vs {test.agentB.name} {test.agentB.version}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">
                  {test.taskName}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    test.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : test.status === "running"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {test.status}
                </span>
              </div>
            </header>

            {test.status === "completed" && test.metrics ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[test.agentA, test.agentB].map((agent, idx) => {
                  const metrics = idx === 0 ? test.metrics!.agentA : test.metrics!.agentB;
                  const isWinner = test.winner === (idx === 0 ? "A" : "B");
                  return (
                    <div
                      key={agent.id}
                      className={`rounded-lg border p-4 ${
                        isWinner
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-800 bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">{idx === 0 ? "Agent A" : "Agent B"}</p>
                          <p className="font-semibold text-white">
                            {agent.name} {agent.version}
                          </p>
                        </div>
                        {isWinner && <Trophy className="h-5 w-5 text-emerald-400" />}
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-slate-500">Completion</dt>
                          <dd className="font-semibold text-white">{metrics.completionTime}s</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Success</dt>
                          <dd className="font-semibold text-white">{metrics.success ? "Yes" : "No"}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Errors</dt>
                          <dd className="font-semibold text-white">{metrics.errorCount}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Quality</dt>
                          <dd className="font-semibold text-white">{metrics.outputQuality}%</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : test.status === "running" ? (
              <div className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                Both agents processing...
              </div>
            ) : (
              <div className="mt-4 text-sm text-rose-400">Test failed</div>
            )}

            {test.status === "completed" && !test.metrics && (
              <div className="mt-4 text-sm text-slate-400">
                Winner declared manually: {test.winner === "A" ? test.agentA.version : test.agentB.version}
              </div>
            )}

            {test.status === "completed" && !test.metrics && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => declareWinner(test.id, "A")}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
                >
                  Promote {test.agentA.version}
                </button>
                <button
                  onClick={() => declareWinner(test.id, "B")}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
                >
                  Promote {test.agentB.version}
                </button>
                <button
                  onClick={() => declareWinner(test.id, "tie")}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
                >
                  Tie
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default AgentABTesting;
