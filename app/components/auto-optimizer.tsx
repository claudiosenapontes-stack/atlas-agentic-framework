"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";

interface Optimization {
  id: string;
  timestamp: string;
  type: "agent_shift" | "scale_up" | "scale_down" | "mix_adjust";
  description: string;
  from: Record<string, number>;
  to: Record<string, number>;
  reason: string;
  autoApplied: boolean;
}

interface OptimizerState {
  enabled: boolean;
  lastOptimization: string | null;
  totalOptimizations: number;
  pendingChanges: Optimization | null;
}

const MOCK_OPTIMIZATIONS: Optimization[] = [
  {
    id: "opt-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    type: "agent_shift",
    description: "Shifting 2 FORGE → VECTOR",
    from: { forge: 4, vector: 2, scout: 1, guard: 1 },
    to: { forge: 2, vector: 4, scout: 1, guard: 1 },
    reason: "High data processing load detected (67% of queue)",
    autoApplied: true,
  },
  {
    id: "opt-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    type: "scale_up",
    description: "Scaled up by 2 agents",
    from: { forge: 2, vector: 2, scout: 1, guard: 1 },
    to: { forge: 3, vector: 3, scout: 1, guard: 1 },
    reason: "Queue depth exceeded threshold (queue > 100)",
    autoApplied: true,
  },
  {
    id: "opt-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    type: "mix_adjust",
    description: "Added 1 GUARD for security tasks",
    from: { forge: 3, vector: 3, scout: 1, guard: 0 },
    to: { forge: 3, vector: 3, scout: 1, guard: 1 },
    reason: "Security incidents increased by 40%",
    autoApplied: false,
  },
];

export function AutoOptimizer() {
  const [state, setState] = useState<OptimizerState>({
    enabled: false,
    lastOptimization: null,
    totalOptimizations: 0,
    pendingChanges: null,
  });
  const [optimizations, setOptimizations] = useState<Optimization[]>(MOCK_OPTIMIZATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const toggleOptimizer = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setState(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
    
    setIsLoading(false);
  };

  const applyOptimization = (optimization: Optimization) => {
    setShowConfirmation(true);
    setState(prev => ({
      ...prev,
      pendingChanges: optimization,
    }));
  };

  const confirmOptimization = async () => {
    if (!state.pendingChanges) return;
    
    setIsLoading(true);
    
    // Simulate API call to apply changes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the optimization as applied
    setOptimizations(prev => 
      prev.map(opt => 
        opt.id === state.pendingChanges?.id 
          ? { ...opt, autoApplied: true } 
          : opt
      )
    );
    
    setState(prev => ({
      ...prev,
      lastOptimization: new Date().toISOString(),
      totalOptimizations: prev.totalOptimizations + 1,
      pendingChanges: null,
    }));
    
    setShowConfirmation(false);
    setIsLoading(false);
  };

  const rejectOptimization = () => {
    setState(prev => ({
      ...prev,
      pendingChanges: null,
    }));
    setShowConfirmation(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "agent_shift":
        return <ArrowRight className="w-4 h-4 text-blue-400" />;
      case "scale_up":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "scale_down":
        return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
      default:
        return <Zap className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="font-semibold text-white">Auto-Optimizer</h3>
            <p className="text-xs text-gray-500">Automatic agent mix optimization</p>
          </div>
        </div>
        <button
          onClick={toggleOptimizer}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
        >
          {state.enabled ? (
            <>
              <ToggleRight className="w-6 h-6 text-green-400" />
              <span className="text-sm text-green-400 font-medium">ON</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-6 h-6 text-gray-500" />
              <span className="text-sm text-gray-500 font-medium">OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Status Banner */}
      <div className={`px-4 sm:px-6 py-3 border-b border-gray-800 ${
        state.enabled ? "bg-green-500/10" : "bg-gray-800/50"
      }`}>
        <div className="flex items-center gap-2">
          {state.enabled ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">
                Auto-optimization enabled • Monitoring queue patterns
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">
                Auto-optimization disabled • Manual adjustments only
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
          <p className="text-2xl font-bold text-white">{state.totalOptimizations}</p>
          <p className="text-xs text-gray-500">Total Optimizations</p>
        </div>
        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
          <p className="text-2xl font-bold text-blue-400">
            {state.lastOptimization ? formatTime(state.lastOptimization) : "—"}
          </p>
          <p className="text-xs text-gray-500">Last Optimization</p>
        </div>
      </div>

      {/* Pending Changes */}
      {state.pendingChanges && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-white mb-1">Pending Optimization</h4>
              <p className="text-sm text-gray-400 mb-3">{state.pendingChanges.description}</p>
              <p className="text-xs text-gray-500 mb-3">{state.pendingChanges.reason}</p>
              
              {!showConfirmation ? (
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors"
                >
                  Review Changes
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={confirmOptimization}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Apply
                  </button>
                  <button
                    onClick={rejectOptimization}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimization Log */}
      <div className="px-4 sm:px-6 py-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Optimization Log</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {optimizations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No optimizations yet</p>
          ) : (
            optimizations.map((opt) => (
              <div
                key={opt.id}
                className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(opt.type)}
                    <span className="font-medium text-white text-sm">{opt.description}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    opt.autoApplied
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {opt.autoApplied ? "Applied" : "Pending"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{opt.reason}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(opt.timestamp)}
                  </span>
                  <span>
                    {Object.entries(opt.from).map(([type, count]) => `${count} ${type}`).join(", ")}
                    {" → "}
                    {Object.entries(opt.to).map(([type, count]) => `${count} ${type}`).join(", ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
