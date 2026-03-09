"use client";

import { useState, useEffect } from "react";
import { 
  Lightbulb, 
  Share2, 
  Download, 
  Filter,
  RefreshCw,
  Zap,
  Brain,
  Shield,
  TrendingUp
} from "lucide-react";

interface Insight {
  id: string;
  agentType: string;
  agentName: string;
  category: "performance" | "pattern" | "error_prevention";
  title: string;
  description: string;
  confidence: number;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  shared: boolean;
  sharedWith: string[];
}

interface InsightsStats {
  total: number;
  shared: number;
  byCategory: {
    performance: number;
    pattern: number;
    error_prevention: number;
  };
  avgConfidence: number;
}

const categoryConfig = {
  performance: { icon: Zap, color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  pattern: { icon: Brain, color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  error_prevention: { icon: Shield, color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
};

export function AgentInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("agentType", filter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);

      const response = await fetch(`/api/agents/insights?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setInsights(data.insights);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [filter, categoryFilter]);

  const toggleShare = async (insight: Insight) => {
    try {
      const response = await fetch("/api/agents/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId: insight.id, shared: !insight.shared }),
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((i) =>
            i.id === insight.id ? { ...i, shared: !i.shared } : i
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle share:", err);
    }
  };

  const exportInsights = () => {
    const data = JSON.stringify(insights, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insights-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-400";
    if (confidence >= 70) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="font-semibold text-white">Agent Insights</h3>
            <p className="text-xs text-gray-500">
              {stats?.total || 0} insights • {stats?.shared || 0} shared
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportInsights}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 px-4 sm:px-6 py-4 border-b border-gray-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.byCategory.performance}</p>
            <p className="text-xs text-gray-500">Performance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.byCategory.pattern}</p>
            <p className="text-xs text-gray-500">Patterns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.byCategory.error_prevention}</p>
            <p className="text-xs text-gray-500">Error Prevention</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            <option value="forge">Forge</option>
            <option value="vector">Vector</option>
            <option value="scout">Scout</option>
            <option value="guard">Guard</option>
            <option value="flux">Flux</option>
          </select>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="performance">Performance</option>
          <option value="pattern">Patterns</option>
          <option value="error_prevention">Error Prevention</option>
        </select>
      </div>

      {/* Insights Feed */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
            Loading insights...
          </div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p>No insights found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {insights.map((insight) => {
              const config = categoryConfig[insight.category];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className="p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-white">{insight.title}</h4>
                        <button
                          onClick={() => toggleShare(insight)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            insight.shared
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                        >
                          <Share2 className="w-3 h-3" />
                          {insight.shared ? "Shared" : "Share"}
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{insight.description}</p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                        <span className="text-gray-500 capitalize">{insight.agentType}</span>
                        <span className={`font-medium ${getConfidenceColor(insight.confidence)}`}>
                          {insight.confidence}% confidence
                        </span>
                        <span className="text-gray-500">{insight.occurrences} occurrences</span>
                        <span className="text-gray-600">First: {formatDate(insight.firstSeen)}</span>
                      </div>

                      {/* Shared With */}
                      {insight.shared && insight.sharedWith.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Shared with:</span>
                          <div className="flex gap-1">
                            {insight.sharedWith.map((agent) => (
                              <span
                                key={agent}
                                className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-xs rounded capitalize"
                              >
                                {agent}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
