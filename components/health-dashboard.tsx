'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Server, Database, Layers, Activity } from 'lucide-react';

interface SystemHealth {
  pm2: {
    status: string;
    processes: number;
    online: number;
  };
  redis: {
    status: string;
    queues: number;
    memory: string;
  };
  supabase: {
    status: string;
    latency: number;
  };
  queues: Record<string, number>;
  timestamp: string;
}

export function HealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health/detailed');
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const getBadgeClass = (status: string, type: 'pm2' | 'redis' | 'supabase') => {
    const isGood = 
      (type === 'pm2' && health.pm2.online === health.pm2.processes) ||
      (type === 'redis' && status === 'connected') ||
      (type === 'supabase' && status === 'connected');
    return isGood 
      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getQueueBadgeClass = (depth: number) => {
    if (depth > 10) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (depth > 0) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-gray-700/50 text-gray-400 border-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">System Health</h2>
        <button 
          onClick={fetchHealth} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg border border-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PM2 Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Server className="w-4 h-4" />
              PM2 Services
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getBadgeClass(health.pm2.status, 'pm2')}`}>
              {health.pm2.online}/{health.pm2.processes} Online
            </span>
          </div>
          <div className="p-4 pt-2">
            <div className="text-2xl font-bold text-white">{health.pm2.processes}</div>
            <p className="text-xs text-gray-500">Total processes</p>
          </div>
        </div>

        {/* Redis Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Layers className="w-4 h-4" />
              Redis
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getBadgeClass(health.redis.status, 'redis')}`}>
              {health.redis.status}
            </span>
          </div>
          <div className="p-4 pt-2">
            <div className="text-2xl font-bold text-white">{health.redis.queues}</div>
            <p className="text-xs text-gray-500">Active queues</p>
          </div>
        </div>

        {/* Supabase Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Database className="w-4 h-4" />
              Supabase
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getBadgeClass(health.supabase.status, 'supabase')}`}>
              {health.supabase.latency}ms
            </span>
          </div>
          <div className="p-4 pt-2">
            <div className="text-2xl font-bold text-white capitalize">{health.supabase.status}</div>
            <p className="text-xs text-gray-500">Database latency</p>
          </div>
        </div>
      </div>

      {/* Queue Depths Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Activity className="w-5 h-5" />
            Queue Depths
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.queues).map(([queue, depth]) => (
              <div key={queue} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm font-medium text-gray-300 capitalize">{queue.replace(/_/g, ' ')}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getQueueBadgeClass(depth)}`}>
                  {depth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-right">
        Last updated: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}

export default HealthDashboard;
