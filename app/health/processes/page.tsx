'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Play, RotateCcw, AlertCircle } from 'lucide-react';

interface PM2Process {
  pid: number;
  name: string;
  status: 'online' | 'stopped' | 'errored' | 'launching';
  uptime: number;
  restarts: number;
  memory: number;
  cpu: number;
}

export default function ProcessMonitorPage() {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health/processes');
      const data = await res.json();
      setProcesses(data.processes || []);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async (name: string) => {
    setActionLoading(name);
    try {
      await fetch(`/api/admin/restart/${name}`, { method: 'POST' });
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to restart:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatMemory = (bytes: number) => {
    const mb = Math.round(bytes / 1024 / 1024);
    return `${mb} MB`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      online: 'bg-green-500/20 text-green-400 border-green-500/30',
      stopped: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      errored: 'bg-red-500/20 text-red-400 border-red-500/30',
      launching: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.stopped}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Process Monitor</h1>
          <p className="text-gray-400">Manage PM2 processes and services</p>
        </div>
        <button 
          onClick={fetchProcesses} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg border border-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {processes.map((proc) => (
          <div 
            key={proc.name} 
            className={`bg-gray-900 rounded-lg border p-6 ${proc.status !== 'online' ? 'border-red-500/50' : 'border-gray-800'}`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg text-white">{proc.name}</h3>
                    {getStatusBadge(proc.status)}
                    {proc.restarts > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {proc.restarts} restart{proc.restarts !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    PID: {proc.pid} • Uptime: {formatUptime(proc.uptime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-white">{formatMemory(proc.memory)}</div>
                  <div className="text-gray-500">Memory</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white">{proc.cpu}%</div>
                  <div className="text-gray-500">CPU</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {proc.status === 'online' ? (
                  <button
                    onClick={() => handleRestart(proc.name)}
                    disabled={actionLoading === proc.name}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm rounded border border-gray-700 transition-colors"
                  >
                    <RotateCcw className={`w-4 h-4 ${actionLoading === proc.name ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestart(proc.name)}
                    disabled={actionLoading === proc.name}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {processes.length === 0 && !loading && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
            <p className="text-gray-500">No processes found</p>
            <button 
              onClick={fetchProcesses}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors mt-4 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-500">Total: </span>
            <span className="font-semibold text-white">{processes.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Online: </span>
            <span className="font-semibold text-green-400">
              {processes.filter(p => p.status === 'online').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Issues: </span>
            <span className="font-semibold text-red-400">
              {processes.filter(p => p.status !== 'online').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total Restarts: </span>
            <span className="font-semibold text-white">
              {processes.reduce((sum, p) => sum + p.restarts, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
