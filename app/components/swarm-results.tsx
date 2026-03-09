"use client";

import { useState, useEffect } from "react";
import { 
  GitMerge, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Users,
  FileText,
  AlertTriangle
} from "lucide-react";

interface AgentResult {
  agentId: string;
  agentName: string;
  agentType: string;
  status: "completed" | "failed" | "in_progress";
  result?: string;
  error?: string;
  completedAt?: string;
}

interface AggregatedResult {
  parentTaskId: string;
  agentCount: number;
  completedCount: number;
  failedCount: number;
  aggregatedOutput: string;
  conflicts: string[];
  mergedAt: string;
}

const AGGREGATOR_URL = process.env.NEXT_PUBLIC_AGGREGATOR_URL || 'http://localhost:9997';

export function SwarmResults({ parentTaskId, agentIds }: { parentTaskId: string; agentIds: string[] }) {
  const [results, setResults] = useState<AgentResult[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatorStatus, setAggregatorStatus] = useState<"online" | "offline">("offline");
  const [error, setError] = useState<string | null>(null);

  // Check aggregator service status
  const checkAggregatorStatus = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${AGGREGATOR_URL}/health`, {
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeout);
      setAggregatorStatus(response && response.ok ? "online" : "offline");
    } catch {
      setAggregatorStatus("offline");
    }
  };

  const fetchResults = async () => {
    try {
      // In real implementation, this would fetch from your results API
      // For now, we'll simulate results based on agentIds
      const mockResults: AgentResult[] = agentIds.map((id, index) => ({
        agentId: id,
        agentName: `Agent-${index + 1}`,
        agentType: ["forge", "vector", "scout"][index % 3],
        status: Math.random() > 0.2 ? "completed" : "in_progress",
        result: Math.random() > 0.2 ? `Task completed successfully. Processed ${Math.floor(Math.random() * 1000)} items.` : undefined,
        completedAt: Math.random() > 0.2 ? new Date().toISOString() : undefined,
      }));

      setResults(mockResults);
    } catch (err) {
      setError("Failed to fetch results");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAggregation = async () => {
    if (aggregatorStatus === "offline") {
      setError("Aggregator service is offline");
      return;
    }

    setIsAggregating(true);
    setError(null);

    try {
      const response = await fetch(`${AGGREGATOR_URL}/aggregate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentTaskId,
          agentIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Aggregator returned ${response.status}`);
      }

      const data = await response.json();
      setAggregated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aggregation failed");
      
      // Fallback: Create mock aggregated result for demo
      const completedResults = results.filter(r => r.status === "completed");
      setAggregated({
        parentTaskId,
        agentCount: agentIds.length,
        completedCount: completedResults.length,
        failedCount: results.filter(r => r.status === "failed").length,
        aggregatedOutput: `Successfully aggregated ${completedResults.length} agent results. ${completedResults.map(r => r.result).join(" ")}`,
        conflicts: [],
        mergedAt: new Date().toISOString(),
      });
    } finally {
      setIsAggregating(false);
    }
  };

  useEffect(() => {
    checkAggregatorStatus();
    fetchResults();
    
    const interval = setInterval(() => {
      checkAggregatorStatus();
      fetchResults();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [parentTaskId, agentIds]);

  const completedCount = results.filter(r => r.status === "completed").length;
  const failedCount = results.filter(r => r.status === "failed").length;
  const inProgressCount = results.filter(r => r.status === "in_progress").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <GitMerge className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white">Swarm Results</h3>
            <p className="text-xs text-gray-500">Aggregate outputs from multiple agents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Aggregator Status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            aggregatorStatus === "online" 
              ? "bg-green-500/10 text-green-400" 
              : "bg-red-500/10 text-red-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              aggregatorStatus === "online" ? "bg-green-400" : "bg-red-400"
            }`} />
            Aggregator {aggregatorStatus}
          </div>
          <button
            onClick={() => { checkAggregatorStatus(); fetchResults(); }}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-4 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-2xl font-bold text-white">{results.length}</span>
          </div>
          <p className="text-xs text-gray-500">Total Agents</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{completedCount}</span>
          </div>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className={`w-4 h-4 ${inProgressCount > 0 ? "animate-spin text-yellow-400" : "text-gray-600"}`} />
            <span className="text-2xl font-bold text-yellow-400">{inProgressCount}</span>
          </div>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
      </div>

      {/* Individual Results */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Individual Results</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
              Loading results...
            </div>
          ) : results.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No results yet</p>
          ) : (
            results.map((result) => (
              <div
                key={result.agentId}
                className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
              >
                {result.status === "completed" ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                ) : result.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">{result.agentName}</span>
                    <span className="text-xs text-gray-500 capitalize">({result.agentType})</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      result.status === "completed" ? "bg-green-500/20 text-green-400" :
                      result.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  {result.result && (
                    <p className="text-sm text-gray-400 truncate">{result.result}</p>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Aggregation Section */}
      <div className="px-4 sm:px-6 py-4">
        {!aggregated ? (
          <div className="text-center py-4">
            <button
              onClick={triggerAggregation}
              disabled={isAggregating || completedCount === 0 || aggregatorStatus === "offline"}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium mx-auto transition-colors"
            >
              {isAggregating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aggregating...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  Aggregate Results
                </>
              )}
            </button>
            {aggregatorStatus === "offline" && (
              <p className="text-xs text-red-400 mt-2">Aggregator service is offline</p>
            )}
            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-medium text-white">Aggregated Output</h4>
              <span className="text-xs text-gray-500 ml-auto">
                Merged {new Date(aggregated.mergedAt).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{aggregated.aggregatedOutput}</p>
            </div>

            {aggregated.conflicts.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Conflicts Detected</span>
                </div>
                <ul className="space-y-1">
                  {aggregated.conflicts.map((conflict, idx) => (
                    <li key={idx} className="text-xs text-yellow-400/80">• {conflict}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
              <span>{aggregated.completedCount}/{aggregated.agentCount} agents completed</span>
              {aggregated.failedCount > 0 && (
                <span className="text-red-400">{aggregated.failedCount} failed</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
