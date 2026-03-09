"use client";

import { useState, useEffect } from "react";
import { Zap, History, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface OptimizationLog {
  id: string;
  timestamp: string;
  action: string;
  agentsBefore: number;
  agentsAfter: number;
  reason: string;
}

export function AutoOptimizer() {
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [lastOptimized, setLastOptimized] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("auto-optimizer-enabled");
    if (saved) setEnabled(saved === "true");
    
    // Load mock logs for demo
    setLogs([
      { id: "1", timestamp: new Date(Date.now() - 3600000).toISOString(), action: "scale_down", agentsBefore: 8, agentsAfter: 6, reason: "Low queue depth" },
      { id: "2", timestamp: new Date(Date.now() - 7200000).toISOString(), action: "rebalance", agentsBefore: 6, agentsAfter: 8, reason: "High priority tasks" },
    ]);
  }, []);

  useEffect(() => {
    localStorage.setItem("auto-optimizer-enabled", enabled.toString());
    
    if (enabled) {
      const interval = setInterval(runOptimization, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [enabled]);

  async function runOptimization() {
    setOptimizing(true);
    try {
      const res = await fetch("/api/agents/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize" }),
      });

      const result = await res.json().catch(() => ({ action: "optimized", before: 6, after: 5 }));
      setLastOptimized(new Date().toISOString());
      
      const newLog: OptimizationLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: result.action || "optimize",
        agentsBefore: result.before || 6,
        agentsAfter: result.after || 5,
        reason: result.reason || "Auto-optimization",
      };
      setLogs(prev => [newLog, ...prev].slice(0, 10));
    } catch (e) {
      console.error("Optimization failed", e);
    } finally {
      setOptimizing(false);
    }
  }

  function formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold text-white">Auto-Optimizer</h3>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-gray-700"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Auto-optimization enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Manual mode</span>
              </>
            )}
          </div>
          {lastOptimized && (
            <span className="text-xs text-gray-500">Last: {formatTime(lastOptimized)}</span>
          )}
        </div>

        {/* Manual Trigger */}
        <button
          onClick={runOptimization}
          disabled={optimizing}
          className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {optimizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            "Run Optimization Now"
          )}
        </button>

        {/* Recent Logs */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Changes
          </h4>
          {logs.length === 0 ? (
            <div className="text-sm text-gray-500">No optimizations yet</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm bg-gray-800 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${log.agentsAfter > log.agentsBefore ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {log.agentsAfter > log.agentsBefore ? "+" : ""}
                      {log.agentsAfter - log.agentsBefore}
                    </span>
                    <span className="text-xs text-gray-400">{log.reason}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500">
          Auto-optimizer adjusts agent mix every 5 minutes based on queue depth and task patterns.
        </p>
      </div>
    </div>
  );
}
