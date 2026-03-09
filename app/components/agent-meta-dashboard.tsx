"use client";

import { useState, useEffect } from "react";
import { 
  Brain, 
  GitBranch, 
  Share2, 
  TrendingUp, 
  RefreshCw,
  Lock,
  Unlock,
  Star,
  Zap
} from "lucide-react";

interface Skill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  unlocked: boolean;
}

interface SkillTree {
  agentType: string;
  totalSkills: number;
  unlockedSkills: number;
  skills: Skill[];
}

interface Reflection {
  id: string;
  agentType: string;
  agentName: string;
  type: string;
  insight: string;
  confidence: number;
  impact: string;
  timestamp: string;
}

interface NetworkNode {
  id: string;
  name: string;
  type: string;
  connections: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

export function AgentMetaDashboard() {
  const [skillTrees, setSkillTrees] = useState<Record<string, SkillTree>>({});
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [network, setNetwork] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("forge");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/agents/meta");
      const data = await response.json();

      if (data.success) {
        setSkillTrees(data.skillTrees);
        setReflections(data.reflections);
        setNetwork(data.network);
      }
    } catch (err) {
      console.error("Failed to fetch meta data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const trainSkill = async (skillId: string) => {
    try {
      await fetch("/api/agents/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: selectedAgent, skillId }),
      });
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Failed to train skill:", err);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      default: return "text-green-400 bg-green-500/10 border-green-500/30";
    }
  };

  const currentTree = skillTrees[selectedAgent];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-semibold text-white">Agent Meta-Cognition</h3>
            <p className="text-xs text-gray-500">Self-awareness and skill development</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Agent Selector */}
      <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3 border-b border-gray-800">
        {Object.keys(skillTrees).map((agentType) => (
          <button
            key={agentType}
            onClick={() => setSelectedAgent(agentType)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              selectedAgent === agentType
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {agentType}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Skill Tree */}
        <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <h4 className="font-medium text-white">Skill Tree</h4>
            {currentTree && (
              <span className="text-xs text-gray-500">
                {currentTree.unlockedSkills}/{currentTree.totalSkills} unlocked
              </span>
            )}
          </div>

          {currentTree && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {currentTree.skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-3 rounded-lg border transition-all ${
                    skill.unlocked
                      ? "bg-gray-800/50 border-gray-700"
                      : "bg-gray-800/20 border-gray-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {skill.unlocked ? (
                        skill.level === skill.maxLevel ? (
                          <Star className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-400" />
                        )
                      ) : (
                        <Lock className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm font-medium text-white">{skill.name}</span>
                    </div>
                    <span className={`text-xs ${skill.unlocked ? "text-blue-400" : "text-gray-600"}`}>
                      Lvl {skill.level}/{skill.maxLevel}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        skill.level === skill.maxLevel ? "bg-yellow-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}
                    />
                  </div>

                  {skill.unlocked && skill.level < skill.maxLevel && (
                    <button
                      onClick={() => trainSkill(skill.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Train
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Reflections */}
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h4 className="font-medium text-white">Self-Reflections</h4>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {reflections
              .filter((r) => r.agentType === selectedAgent)
              .map((reflection) => (
                <div
                  key={reflection.id}
                  className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-white">{reflection.insight}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getImpactColor(reflection.impact)}`}>
                      {reflection.impact}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{reflection.confidence}% confidence</span>
                    <span>•</span>
                    <span>{new Date(reflection.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

            {reflections.filter((r) => r.agentType === selectedAgent).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No reflections yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Collaboration Network */}
      {network && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-4 h-4 text-pink-400" />
            <h4 className="font-medium text-white">Collaboration Network</h4>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {network.nodes.map((node) => (
              <div
                key={node.id}
                className={`relative p-3 rounded-lg border transition-all ${
                  node.id === selectedAgent
                    ? "bg-purple-500/20 border-purple-500/50"
                    : "bg-gray-800 border-gray-700"
                }`}
              >
                <div className="text-center">
                  <p className="font-medium text-white capitalize">{node.name}</p>
                  <p className="text-xs text-gray-500">{node.connections} connections</p>
                </div>
                
                {/* Connection lines visualization */}
                {network.edges
                  .filter((e) => e.source === node.id || e.target === node.id)
                  .map((edge, idx) => {
                    const otherNode = edge.source === node.id ? edge.target : edge.source;
                    return (
                      <div
                        key={idx}
                        className="absolute -right-2 top-1/2 transform -translate-y-1/2 translate-x-full"
                      >
                        <span className="text-xs text-gray-600">→ {otherNode}</span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
