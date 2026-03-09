"use client";

import { useState, useEffect } from "react";
import { 
  Gauge, 
  Plus, 
  Power, 
  RefreshCw, 
  Users,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface ScaleStatus {
  queueDepth: number;
  queueStats: Record<string, number>;
  thresholds: { low: number; medium: number; high: number };
  currentAgents: number;
  recommendedAgents: number;
  agentsToSpawn: number;
  status: string;
  color: string;
  autoScalingEnabled: boolean;
  lastScaleAction: any;
}

export function AutoScaler() {
  const [status, setStatus] = useState<ScaleStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/agents/scale");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutoScale = async () => {
    if (!status) return;
    
    setIsToggling(true);
    try {
      const response = await fetch("/api/agents/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.autoScalingEnabled }),
      });

      if (response.ok) {
        setStatus((prev) => prev ? { ...prev, autoScalingEnabled: !prev.autoScalingEnabled } : null);
      }
    } catch (err) {
      console.error("Failed to toggle auto-scale:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const getGaugeColor = () => {
    if (!status) return "bg-gray-600";
    switch (status.color) {
      case "red": return "bg-red-500";
      case "yellow": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };

  const getGaugeWidth = () => {
    if (!status) return "0%";
    const percentage = (status.queueDepth / status.thresholds.high) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 bg-gray-800 rounded" />
          <div className="h-4 w-full bg-gray-800 rounded" />
          <div className="h-24 w-full bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <p className="text-red-400">Failed to load auto-scaler</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">Auto-Scaler</h3>
            <p className="text-xs text-gray-500">Predictive scaling based on queue depth</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Queue Depth Gauge */}
      <div className="px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Queue Depth</span>
          <span className={`text-2xl font-bold ${
            status.color === "red" ? "text-red-400" :
            status.color === "yellow" ? "text-yellow-400" : "text-green-400"
          }`}>
            {status.queueDepth}
          </span>
        </div>

        {/* Gauge Bar */}
        <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ${getGaugeColor()}`}
            style={{ width: getGaugeWidth() }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-600" style={{ left: `${(status.thresholds.low / status.thresholds.high) * 100}%` }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-600" style={{ left: `${(status.thresholds.medium / status.thresholds.high) * 100}%` }} />
        </div>

        {/* Legend */}
        <div className="flex justify-between text-xs text-gray-500 mb-6">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Normal (&lt;{status.thresholds.low})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Elevated ({status.thresholds.low}-{status.thresholds.medium})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Critical (&gt;{status.thresholds.medium})
          </span>
        </div>

        {/* Recommendation */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Current Agents</span>
            </div>
            <span className="text-xl font-bold text-white">{status.currentAgents}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Recommended</span>
            </div>
            <span className="text-xl font-bold text-blue-400">{status.recommendedAgents}</span>
          </div>

          {status.agentsToSpawn > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <span className="text-sm text-blue-400">Agents to Spawn</span>
              <span className="text-xl font-bold text-blue-400">+{status.agentsToSpawn}</span>
            </div>
          )}
        </div>

        {/* Auto-Scale Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.autoScalingEnabled ? "bg-green-500/20" : "bg-gray-700"}`}>
              <Power className={`w-5 h-5 ${status.autoScalingEnabled ? "text-green-400" : "text-gray-500"}`} />
            </div>
            <div>
              <p className="font-medium text-white">Auto-Scaling</p>
              <p className="text-xs text-gray-500">
                {status.autoScalingEnabled 
                  ? `Will spawn agents at ${status.thresholds.medium}+ tasks` 
                  : "Manual scaling only"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAutoScale}
            disabled={isToggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              status.autoScalingEnabled ? "bg-green-500" : "bg-gray-600"
            } ${isToggling ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                status.autoScalingEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Status Alert */}
        {status.color !== "green" && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            status.color === "red" ? "bg-red-500/10 border border-red-500/30" :
            "bg-yellow-500/10 border border-yellow-500/30"
          }`}>
            {status.color === "red" ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className={`text-sm ${
              status.color === "red" ? "text-red-400" : "text-yellow-400"
            }`}>
              {status.color === "red" 
                ? "Queue depth critical! Spawn agents immediately." 
                : "Queue depth elevated. Consider spawning agents."}
            </span>
          </div>
        )}

        {status.color === "green" && status.autoScalingEnabled && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Queue depth normal. No action needed.</span>
          </div>
        )}
      </div>
    </div>
  );
}
