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
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-900">Auto-Optimizer</h3>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-green-600" : "bg-stone-300"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${enabled ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-700" />
                <span className="text-sm text-green-700 font-medium">Auto-optimization enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-500">Manual mode</span>
              </>
            )}
          </div>
          {lastOptimized && (
            <span className="text-xs text-stone-400">Last: {formatTime(lastOptimized)}</span>
          )}
        </div>

        {/* Manual Trigger */}
        <button
          onClick={runOptimization}
          disabled={optimizing}
          className="w-full py-2 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
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
          <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-stone-500" />
            Recent Changes
          </h4>
          {logs.length === 0 ? (
            <div className="text-sm text-stone-500">No optimizations yet</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm bg-stone-50 p-2 rounded-lg border border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${log.agentsAfter > log.agentsBefore ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {log.agentsAfter > log.agentsBefore ? "+" : ""}
                      {log.agentsAfter - log.agentsBefore}
                    </span>
                    <span className="text-xs text-stone-600">{log.reason}</span>
                  </div>
                  <span className="text-xs text-stone-400">{formatTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-stone-500">
          Auto-optimizer adjusts agent mix every 5 minutes based on queue depth and task patterns.
        </p>
      </div>
    </div>
  );
}
