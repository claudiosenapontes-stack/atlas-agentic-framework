'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">System Health</h2>
        <Button onClick={fetchHealth} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4" />
              PM2 Services
            </CardTitle>
            <Badge variant={health.pm2.online === health.pm2.processes ? 'default' : 'destructive'}>
              {health.pm2.online}/{health.pm2.processes} Online
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.pm2.processes}</div>
            <p className="text-xs text-muted-foreground">Total processes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Redis
            </CardTitle>
            <Badge variant={health.redis.status === 'connected' ? 'default' : 'destructive'}>
              {health.redis.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.redis.queues}</div>
            <p className="text-xs text-muted-foreground">Active queues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Supabase
            </CardTitle>
            <Badge variant={health.supabase.status === 'connected' ? 'default' : 'destructive'}>
              {health.supabase.latency}ms
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{health.supabase.status}</div>
            <p className="text-xs text-muted-foreground">Database latency</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Queue Depths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.queues).map(([queue, depth]) => (
              <div key={queue} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium capitalize">{queue.replace(/_/g, ' ')}</span>
                <Badge variant={depth > 10 ? 'destructive' : depth > 0 ? 'secondary' : 'outline'}>
                  {depth}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}

export default HealthDashboard;