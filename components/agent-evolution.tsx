"use client";

import { useState } from "react";
import { Dna, Zap, Cpu, Shield, GitCommit, Sparkles } from "lucide-react";

interface AgentGeneration {
  version: string;
  number: number;
  createdAt: string;
  improvements: string[];
  metrics: {
    avgResponseTime: number;
    successRate: number;
    errorRate: number;
    tasksCompleted: number;
  };
  changes: string[];
}

interface AgentType {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  generations: AgentGeneration[];
}

const DEFAULT_AGENTS: AgentType[] = [
  {
    id: "forge",
    name: "FORGE",
    color: "from-amber-500 to-orange-500",
    icon: <Zap className="w-5 h-5" />, 
    generations: [
      {
        version: "forge-v1",
        number: 1,
        createdAt: "2026-03-01",
        improvements: ["Initial release"],
        metrics: { avgResponseTime: 2.3, successRate: 87, errorRate: 13, tasksCompleted: 1240 },
        changes: ["Initial release", "Baseline toolchain"],
      },
      {
        version: "forge-v2",
        number: 2,
        createdAt: "2026-03-05",
        improvements: ["Response caching", "Better error recovery"],
        metrics: { avgResponseTime: 1.4, successRate: 94, errorRate: 6, tasksCompleted: 2890 },
        changes: ["Added caching layer", "Improved error handling", "+39% speed"],
      },
    ],
  },
  {
    id: "vector",
    name: "VECTOR",
    color: "from-blue-500 to-cyan-500",
    icon: <Cpu className="w-5 h-5" />, 
    generations: [
      {
        version: "vector-v1",
        number: 1,
        createdAt: "2026-03-02",
        improvements: ["Initial release"],
        metrics: { avgResponseTime: 3.1, successRate: 91, errorRate: 9, tasksCompleted: 890 },
        changes: ["Initial release", "Embedding search MVP"],
      },
      {
        version: "vector-v2",
        number: 2,
        createdAt: "2026-03-06",
        improvements: ["Parallel processing", "Streaming"],
        metrics: { avgResponseTime: 1.8, successRate: 96, errorRate: 4, tasksCompleted: 1560 },
        changes: ["Parallel query execution", "Streaming responses", "+42% speed"],
      },
      {
        version: "vector-v3",
        number: 3,
        createdAt: "2026-03-08",
        improvements: ["Caching", "Validation"],
        metrics: { avgResponseTime: 1.2, successRate: 98, errorRate: 2, tasksCompleted: 2100 },
        changes: ["Result caching", "Strict validation", "+33% speed"],
      },
    ],
  },
  {
    id: "sentinel",
    name: "SENTINEL",
    color: "from-emerald-500 to-green-500",
    icon: <Shield className="w-5 h-5" />, 
    generations: [
      {
        version: "sentinel-v1",
        number: 1,
        createdAt: "2026-03-03",
        improvements: ["Initial release"],
        metrics: { avgResponseTime: 1.5, successRate: 89, errorRate: 11, tasksCompleted: 670 },
        changes: ["Initial release", "Base monitoring"],
      },
    ],
  },
];

const IMPROVEMENT_OPTIONS = [
  "Response caching",
  "Better error recovery",
  "Parallel processing",
  "Streaming output",
  "Smart retries",
  "Input validation",
];

export function AgentEvolution() {
  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const evolveAgent = async () => {
    if (!selectedAgentId) {
      setStatus("Choose an agent to evolve.");
      return;
    }
    if (selectedImprovements.length === 0) {
      setStatus("Select at least one improvement.");
      return;
    }

    setStatus("Evolving agent...");
    try {
      const res = await fetch("/api/agents/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedAgentId,
          improvements: selectedImprovements.map((label) => label.toLowerCase().replace(/\s+/g, "_")),
        }),
      });

      if (!res.ok) throw new Error("Failed to evolve");
      const data = await res.json();

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== selectedAgentId) return agent;
          const last = agent.generations[agent.generations.length - 1];
          const newGen: AgentGeneration = {
            version: data.newVersion,
            number: data.versionNumber,
            createdAt: new Date().toISOString().split("T")[0],
            improvements: selectedImprovements,
            metrics: {
              avgResponseTime: parseFloat((last.metrics.avgResponseTime * 0.85).toFixed(2)),
              successRate: Math.min(99, last.metrics.successRate + 3),
              errorRate: Math.max(1, last.metrics.errorRate - 2),
              tasksCompleted: 0,
            },
            changes: data.changes,
          };
          return { ...agent, generations: [...agent.generations, newGen] };
        })
      );

      setStatus(`${data.newVersion} created.`);
      setSelectedImprovements([]);
    } catch (err) {
      setStatus("Evolution failed. Try again.");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Dna className="w-6 h-6 text-purple-500" /> Agent Evolution
          </h2>
          <p className="text-sm text-slate-400">Track generations and spin up improved agents.</p>
        </div>
        <span className="text-sm text-slate-400">
          Total generations: {agents.reduce((sum, agent) => sum + agent.generations.length, 0)}
        </span>
      </header>

      {/* Evolution Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-slate-300">Agent</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <option value="">Select agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} (v{agent.generations[agent.generations.length - 1].number})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-300">Improvements</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {IMPROVEMENT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setSelectedImprovements((prev) =>
                      prev.includes(option)
                        ? prev.filter((o) => o !== option)
                        : [...prev, option]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedImprovements.includes(option)
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500"
            onClick={evolveAgent}
          >
            Evolve Agent
          </button>
          {status && <span className="text-sm text-slate-400">{status}</span>}
        </div>
      </div>

      {/* Agent timelines */}
      <div className="space-y-6">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-2xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl bg-gradient-to-br ${agent.color} p-3 text-white`}>
                  {agent.icon}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">{agent.name}</p>
                  <p className="text-lg font-semibold text-white">
                    Current: {agent.generations[agent.generations.length - 1].version}
                  </p>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                {agent.generations.length} generations
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {agent.generations.map((gen, idx) => {
                  const previous = idx > 0 ? agent.generations[idx - 1] : undefined;
                  const speed = previous
                    ? Math.round(
                        ((previous.metrics.avgResponseTime - gen.metrics.avgResponseTime) /
                          previous.metrics.avgResponseTime) *
                          100
                      )
                    : 0;
                  const success = previous
                    ? gen.metrics.successRate - previous.metrics.successRate
                    : 0;
                  const errors = previous
                    ? previous.metrics.errorRate - gen.metrics.errorRate
                    : 0;

                  return (
                    <div
                      key={gen.version}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <GitCommit className="h-4 w-4 text-purple-400" />
                          <span className="font-semibold text-white">{gen.version}</span>
                          <span className="text-xs text-slate-500">{gen.createdAt}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>Success: {gen.metrics.successRate}%</span>
                          <span>Error: {gen.metrics.errorRate}%</span>
                          <span>Tasks: {gen.metrics.tasksCompleted}</span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-300">
                        <p className="font-semibold text-slate-200">Mutation log</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {gen.changes.map((change, changeIdx) => (
                            <li key={changeIdx}>{change}</li>
                          ))}
                        </ul>
                      </div>

                      {previous && (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-emerald-400">
                          <span>+{speed}% faster</span>
                          <span>+{success}% success</span>
                          <span>-{errors}% errors</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AgentEvolution;
