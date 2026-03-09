"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface Prediction {
  queueDepth: number;
  recommendedAgents: number;
  hourlyCost: number;
}

interface AnalyticsData {
  current: {
    queueDepth: number;
    agents: number;
    hourlyCost: number;
    agentTypes: Record<string, number>;
  };
  predictions: {
    "1h": Prediction;
    "6h": Prediction;
    "24h": Prediction;
  };
  optimalMix: Record<string, number>;
  trend: "increasing" | "decreasing" | "stable";
  confidence: number;
}

export function PredictiveAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics/predict");
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = () => {
    switch (data?.trend) {
      case "increasing":
        return <TrendingUp className="w-5 h-5 text-red-400" />;
      case "decreasing":
        return <TrendingDown className="w-5 h-5 text-green-400" />;
      default:
        return <Minus className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 bg-gray-800 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-800 rounded" />
            <div className="h-24 bg-gray-800 rounded" />
            <div className="h-24 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <p>Failed to load analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">Predictive Analytics</h3>
            <p className="text-xs text-gray-500">Queue forecast & agent demand</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500">Confidence:</span>
            <span className={`font-medium ${getConfidenceColor(data.confidence)}`}>
              {data.confidence}%
            </span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Current Status</span>
          {getTrendIcon()}
          <span className={`text-xs capitalize ${
            data.trend === 'increasing' ? 'text-red-400' :
            data.trend === 'decreasing' ? 'text-green-400' :
            'text-yellow-400'
          }`}>
            {data.trend}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{data.current.queueDepth}</p>
            <p className="text-xs text-gray-500">Queue Depth</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{data.current.agents}</p>
            <p className="text-xs text-gray-500">Active Agents</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">${data.current.hourlyCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Cost/Hour</p>
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Queue Forecast</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">1 Hour</span>
            </div>
            <p className="text-xl font-bold text-white">{data.predictions["1h"].queueDepth}</p>
            <p className="text-xs text-gray-500">predicted queue</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">6 Hours</span>
            </div>
            <p className="text-xl font-bold text-white">{data.predictions["6h"].queueDepth}</p>
            <p className="text-xs text-gray-500">predicted queue</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-orange-400 font-medium">24 Hours</span>
            </div>
            <p className="text-xl font-bold text-white">{data.predictions["24h"].queueDepth}</p>
            <p className="text-xs text-gray-500">predicted queue</p>
          </div>
        </div>
      </div>

      {/* Agent Demand */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Agent Demand</h4>
        <div className="space-y-3">
          {Object.entries(data.predictions).map(([timeframe, prediction]) => (
            <div key={timeframe} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white capitalize">{timeframe}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-400">{prediction.recommendedAgents}</span>
                  <span className="text-xs text-gray-500 block">agents needed</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-green-400">${prediction.hourlyCost.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 block">/hour</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimal Mix */}
      <div className="px-4 sm:px-6 py-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Optimal Agent Mix</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.optimalMix).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white capitalize">{type}</span>
              <span className="text-sm font-bold text-blue-400">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
