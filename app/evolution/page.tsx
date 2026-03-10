"use client";

import { useState } from "react";
import { AgentEvolution } from "@/components/agent-evolution";
import { AgentABTesting } from "@/components/agent-ab-testing";
import { Dna, GitBranch, Sparkles, BarChart2 } from "lucide-react";

const TABS = [
  { id: "lineage", label: "Lineages", icon: GitBranch },
  { id: "evolution", label: "Evolve", icon: Sparkles },
  { id: "testing", label: "A/B Testing", icon: BarChart2 },
];

export default function EvolutionPage() {
  const [tab, setTab] = useState<"lineage" | "evolution" | "testing">("lineage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Dna className="h-7 w-7 text-purple-400" /> Agent Evolution
          </h1>
          <p className="text-slate-400">Lineages, evolution controls, A/B testing.</p>
        </div>
        <div className="flex gap-2">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === tabItem.id
                  ? "bg-purple-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab(tabItem.id as any)}
            >
              <tabItem.icon className="h-4 w-4" />
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {tab === "lineage" && (
          <section className="rounded-2xl border border-slate-900 bg-slate-950/60 p-6">
            <p className="text-sm text-slate-400">Lineages coming soon.</p>
          </section>
        )}
        {tab === "evolution" && <AgentEvolution />}
        {tab === "testing" && <AgentABTesting />}
      </div>
    </div>
  );
}
