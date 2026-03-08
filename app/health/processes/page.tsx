'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      online: 'default',
      stopped: 'secondary',
      errored: 'destructive',
      launching: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Process Monitor</h1>
          <p className="text-muted-foreground">Manage PM2 processes and services</p>
        </div>
        <Button onClick={fetchProcesses} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {processes.map((proc) => (
          <Card key={proc.name} className={proc.status !== 'online' ? 'border-destructive' : ''}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{proc.name}</h3>
                      {getStatusBadge(proc.status)}
                      {proc.restarts > 0 && (
                        <Badge variant="outline" className="text-amber-500">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {proc.restarts} restart{proc.restarts !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      PID: {proc.pid} • Uptime: {formatUptime(proc.uptime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{formatMemory(proc.memory)}</div>
                    <div className="text-muted-foreground">Memory</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{proc.cpu}%</div>
                    <div className="text-muted-foreground">CPU</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {proc.status === 'online' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestart(proc.name)}
                      disabled={actionLoading === proc.name}
                    >
                      <RotateCcw className={`w-4 h-4 mr-2 ${actionLoading === proc.name ? 'animate-spin' : ''}`} />
                      Restart
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRestart(proc.name)}
                      disabled={actionLoading === proc.name}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {processes.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No processes found</p>
            <Button onClick={fetchProcesses} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        )}
      </div>

      <Card className="bg-muted">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{processes.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Online: </span>
              <span className="font-semibold text-green-600">
                {processes.filter(p => p.status === 'online').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Issues: </span>
              <span className="font-semibold text-red-600">
                {processes.filter(p => p.status !== 'online').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Restarts: </span>
              <span className="font-semibold">
                {processes.reduce((sum, p) => sum + p.restarts, 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
