"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Users, Brain, RefreshCw } from "lucide-react";

interface Prediction {
  timeframe: string;
  queueDepth: number;
  confidence: number;
}

interface AgentMix {
  type: string;
  count: number;
  efficiency: number;
}

interface AnalyticsData {
  predictions: Prediction[];
  costPerHour: number;
  recommendedMix: AgentMix[];
  estimatedSavings: number;
}

export function PredictiveAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPredictions() {
    try {
      const res = await fetch("/api/analytics/predict");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch predictions", e);
    } finally {
      setLoading(false);
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500/20";
    if (confidence >= 60) return "bg-yellow-500/20";
    return "bg-orange-500/20";
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Predictive Analytics</h3>
        </div>
        <div className="text-gray-500 text-center py-4">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
          Loading predictions...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Predictive Analytics</h3>
        </div>
        <div className="text-gray-500 text-center py-4">No prediction data available</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Predictive Analytics</h3>
        </div>
        <button onClick={fetchPredictions} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Queue Forecast */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Queue Forecast
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {data.predictions.map((p) => (
              <div key={p.timeframe} className="bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-xs text-gray-500 mb-1">{p.timeframe}</div>
                <div className="text-xl font-bold text-white">{p.queueDepth}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceBg(p.confidence)} ${getConfidenceColor(p.confidence)}`}>
                  {p.confidence}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Estimator */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Cost Estimator
          </h4>
          <div className="bg-gray-800 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Current run rate</span>
              <span className="font-semibold text-white">${data.costPerHour.toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-400">Potential savings</span>
              <span className="font-semibold text-green-400">${data.estimatedSavings.toFixed(2)}/hr</span>
            </div>
          </div>
        </div>

        {/* Optimal Agent Mix */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-400" />
            Recommended Agent Mix
          </h4>
          <div className="space-y-2">
            {data.recommendedMix.map((agent) => (
              <div key={agent.type} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg">
                <span className="text-sm text-gray-300 capitalize">{agent.type}</span>
                <div className="flex items-center gap-3">
                  <span className="bg-gray-700 text-white text-xs px-2 py-1 rounded">{agent.count}</span>
                  <span className="text-xs text-gray-500">{agent.efficiency}% eff</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
