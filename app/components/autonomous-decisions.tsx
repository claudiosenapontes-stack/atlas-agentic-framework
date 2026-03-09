"use client";

import { useState, useEffect } from "react";
import { 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Sliders,
  RefreshCw,
  Shield,
  Activity,
  Clock
} from "lucide-react";

interface Decision {
  id: string;
  agentType: string;
  agentName: string;
  decision: string;
  context: string;
  action: string;
  confidence: number;
  autonomyUsed: boolean;
  timestamp: string;
  outcome: string;
}

interface DecisionStats {
  total: number;
  autonomous: number;
  humanRequired: number;
  success: number;
  avgConfidence: number;
}

export function AutonomousDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [autonomyLevel, setAutonomyLevel] = useState(75);
  const [humanOverride, setHumanOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/agents/autonomy");
      const data = await response.json();

      if (data.success) {
        setDecisions(data.decisions);
        setStats(data.stats);
        setAutonomyLevel(data.autonomyLevel);
        setHumanOverride(data.humanOverrideActive);
      }
    } catch (err) {
      console.error("Failed to fetch autonomy data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateAutonomyLevel = async (level: number) => {
    try {
      await fetch("/api/agents/autonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setLevel", level }),
      });
      setAutonomyLevel(level);
    } catch (err) {
      console.error("Failed to update autonomy level:", err);
    }
  };

  const overrideDecision = async (decisionId: string, approved: boolean) => {
    try {
      await fetch("/api/agents/autonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override", decisionId, approved }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to override decision:", err);
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "pending_review":
      case "pending_human":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAutonomyColor = (level: number) => {
    if (level >= 80) return "text-green-400";
    if (level >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white">Autonomous Decisions</h3>
            <p className="text-xs text-gray-500">Agent decision log & override controls</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats & Autonomy Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-gray-800">
        {/* Stats */}
        <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-400" />
            <h4 className="font-medium text-white">Decision Statistics</h4>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Decisions</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.autonomous}</p>
                <p className="text-xs text-gray-500">Autonomous</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.success}</p>
                <p className="text-xs text-gray-500">Successful</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.avgConfidence}%</p>
                <p className="text-xs text-gray-500">Avg Confidence</p>
              </div>
            </div>
          )}
        </div>

        {/* Autonomy Control */}
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h4 className="font-medium text-white">Autonomy Control</h4>
          </div>

          <div className="space-y-4">
            {/* Autonomy Level Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Delegate Authority</span>
                <span className={`text-2xl font-bold ${getAutonomyColor(autonomyLevel)}`}>
                  {autonomyLevel}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={autonomyLevel}
                onChange={(e) => updateAutonomyLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Manual (0%)</span>
                <span>Balanced (50%)</span>
                <span>Full Auto (100%)</span>
              </div>
            </div>

            {/* Override Status */}
            <div className={`p-3 rounded-lg border ${
              humanOverride
                ? "bg-red-500/10 border-red-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${humanOverride ? "text-red-400" : "text-green-400"}`} />
                <span className={`text-sm font-medium ${humanOverride ? "text-red-400" : "text-green-400"}`}>
                  {humanOverride ? "Human Override Active" : "Autonomous Mode Enabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Log */}
      <div className="px-4 sm:px-6 py-4">
        <h4 className="font-medium text-white mb-3">Recent Decisions</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {decisions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No decisions logged</p>
          ) : (
            decisions.map((decision) => (
              <div
                key={decision.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedDecision === decision.id
                    ? "bg-gray-800 border-indigo-500/50"
                    : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setSelectedDecision(
                  selectedDecision === decision.id ? null : decision.id
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getOutcomeIcon(decision.outcome)}
                    <div>
                      <p className="text-sm font-medium text-white">{decision.decision}</p>
                      <p className="text-xs text-gray-500 capitalize">{decision.agentType} • {formatTime(decision.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      decision.autonomyUsed
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {decision.autonomyUsed ? "Auto" : "Manual"}
                    </span>
                    <span className={`text-xs ${
                      decision.confidence >= 80 ? "text-green-400" :
                      decision.confidence >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {decision.confidence}%
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedDecision === decision.id && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-500">Context:</span> {decision.context}
                    </p>
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-500">Action:</span> {decision.action}
                    </p>
                    
                    {/* Override Buttons */}
                    {(decision.outcome === "pending_review" || decision.outcome === "pending_human") && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            overrideDecision(decision.id, true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            overrideDecision(decision.id, false);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
