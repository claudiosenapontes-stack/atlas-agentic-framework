'use client';

import { useState, useEffect } from 'react'
import { Activity, Server, Cpu, HardDrive, RefreshCw, CheckCircle, XCircle, AlertCircle, Zap, Shield, Database, Globe } from 'lucide-react'

export default function HealthPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const [healthData, setHealthData] = useState({
    pm2Services: [
      { name: 'mc-gateway', status: 'healthy', cpu: '2%', memory: '45MB', restarts: 0 },
      { name: 'mc-task-orchestrator', status: 'healthy', cpu: '3%', memory: '52MB', restarts: 0 },
      { name: 'mc-heartbeat-reporter', status: 'healthy', cpu: '1%', memory: '32MB', restarts: 0 },
      { name: 'mc-incident-watcher', status: 'healthy', cpu: '1%', memory: '35MB', restarts: 0 },
      { name: 'mc-redis-queue-worker', status: 'healthy', cpu: '4%', memory: '55MB', restarts: 1 },
    ],
    acpAgents: [
      { name: 'Alpha', status: 'healthy', responsiveness: 98, contextWindow: '45%' },
      { name: 'Beta', status: 'healthy', responsiveness: 95, contextWindow: '62%' },
      { name: 'Gamma', status: 'degraded', responsiveness: 72, contextWindow: '89%' },
    ],
    severinoGuards: [
      { name: 'Watchdog', status: 'healthy', active: true },
      { name: 'Circuit Breaker', status: 'healthy', active: true },
      { name: 'Rate Limiter', status: 'healthy', active: true },
    ],
    infrastructure: [
      { name: 'Gateway', status: 'healthy', latency: '12ms', uptime: '99.9%' },
      { name: 'Redis', status: 'healthy', latency: '2ms', memory: '42%' },
      { name: 'Supabase', status: 'healthy', latency: '24ms', connections: 12 },
      { name: 'API', status: 'healthy', latency: '18ms', errors: 0 },
    ],
    restartTrends: { last24h: 2, last7d: 5, spike: false },
    memoryWarnings: [
      { service: 'mc-redis-queue-worker', usage: '78%', threshold: '80%' },
    ]
  })

  const fetchHealthData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        const data = await response.json()
        setHealthData(prev => ({ ...prev, ...data }))
      }
    } catch (err) {
      console.error('Failed to fetch health data:', err)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    fetchHealthData()
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="w-4 h-4 text-[#16C784]" />
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-[#FFB020]" />
      default:
        return <XCircle className="w-4 h-4 text-[#FF3B30]" />
    }
  }

  const allHealthy = healthData.pm2Services.every(s => s.status === 'healthy') &&
                     healthData.infrastructure.every(s => s.status === 'healthy')

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Health Center</h1>
          <p className="text-xs text-[#6B7280]">System infrastructure monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchHealthData} className="p-2 rounded-lg bg-[#111214] border border-[#1F2226] text-[#6B7280] hover:text-white">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            allHealthy ? 'bg-[#16C784]/10 border-[#16C784]/30' : 'bg-[#FFB020]/10 border-[#FFB020]/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${allHealthy ? 'bg-[#16C784]' : 'bg-[#FFB020]'} ${allHealthy ? 'animate-pulse' : ''}`} />
            <span className={`text-xs ${allHealthy ? 'text-[#16C784]' : 'text-[#FFB020]'}`}>
              {allHealthy ? 'All Systems Healthy' : 'Degraded Services'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Server className="w-5 h-5 text-[#9BA3AF]" />} label="PM2 Services" value={healthData.pm2Services.length} subvalue="Online" />
        <StatCard icon={<Cpu className="w-5 h-5 text-[#9BA3AF]" />} label="ACP Agents" value={healthData.acpAgents.length} subvalue={`${healthData.acpAgents.filter(a => a.status === 'healthy').length} healthy`} />
        <StatCard icon={<Shield className="w-5 h-5 text-[#16C784]" />} label="Severino Guards" value={healthData.severinoGuards.filter(g => g.active).length} subvalue="Active" />
        <StatCard icon={<Activity className="w-5 h-5 text-[#FFB020]" />} label="Restarts (24h)" value={healthData.restartTrends.last24h} subvalue={healthData.restartTrends.spike ? 'Spike!' : 'Normal'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="PM2 Services" icon={<Server className="w-4 h-4" />}>
          <div className="space-y-2">
            {healthData.pm2Services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <span className="text-xs text-white">{service.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#6B7280]">CPU {service.cpu}</span>
                  <span className="text-[10px] text-[#6B7280]">Mem {service.memory}</span>
                  {service.restarts > 0 && <span className="text-[10px] text-[#FFB020]">{service.restarts} restarts</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="ACP Agents" icon={<Cpu className="w-4 h-4" />}>
          <div className="space-y-2">
            {healthData.acpAgents.map((agent) => (
              <div key={agent.name} className="p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(agent.status)}
                    <span className="text-xs text-white">{agent.name}</span>
                  </div>
                  <span className={`text-[10px] ${agent.responsiveness > 80 ? 'text-[#16C784]' : agent.responsiveness > 50 ? 'text-[#FFB020]' : 'text-[#FF3B30]'}`}>{agent.responsiveness}% resp</span>
                </div>
                <div className="h-1 bg-[#1F2226] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${parseInt(agent.contextWindow) > 80 ? 'bg-[#FF3B30]' : parseInt(agent.contextWindow) > 60 ? 'bg-[#FFB020]' : 'bg-[#16C784]'}`} style={{ width: agent.contextWindow }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] mt-1">
                  <span>Context window</span><span>{agent.contextWindow}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Severino Guards" icon={<Shield className="w-4 h-4" />}>
          <div className="space-y-2">
            {healthData.severinoGuards.map((guard) => (
              <div key={guard.name} className="flex items-center justify-between p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${guard.active ? 'text-[#16C784]' : 'text-[#6B7280]'}`} />
                  <span className="text-xs text-white">{guard.name}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${guard.active ? 'bg-[#16C784]/20 text-[#16C784]' : 'bg-[#6B7280]/20 text-[#6B7280]'}`}>{guard.active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Infrastructure" icon={<Database className="w-4 h-4" />}>
          <div className="space-y-2">
            {healthData.infrastructure.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                <div className="flex items-center gap-2">
                  {item.name === 'Gateway' && <Globe className="w-4 h-4 text-[#9BA3AF]" />}
                  {item.name === 'Redis' && <Database className="w-4 h-4 text-[#9BA3AF]" />}
                  {item.name === 'Supabase' && <Database className="w-4 h-4 text-[#9BA3AF]" />}
                  {item.name === 'API' && <Activity className="w-4 h-4 text-[#9BA3AF]" />}
                  <span className="text-xs text-white">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {item.latency && <span className="text-[10px] text-[#6B7280]">{item.latency}</span>}
                  {item.memory && <span className="text-[10px] text-[#6B7280]">Mem {item.memory}</span>}
                  {getStatusIcon(item.status)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Memory Warnings" icon={<HardDrive className="w-4 h-4" />}>
          {healthData.memoryWarnings.length > 0 ? (
            <div className="space-y-2">
              {healthData.memoryWarnings.map((warning) => (
                <div key={warning.service} className="flex items-center justify-between p-2 bg-[#FFB020]/5 rounded border border-[#FFB020]/20">
                  <span className="text-xs text-white">{warning.service}</span>
                  <div className="text-right">
                    <span className="text-xs text-[#FFB020]">{warning.usage}</span>
                    <span className="text-[10px] text-[#6B7280] ml-2">/ {warning.threshold} threshold</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-[#6B7280]">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-[#16C784]" />
              <p className="text-xs">No memory warnings</p>
            </div>
          )}
        </Section>

        <Section title="Restart Trends" icon={<Zap className="w-4 h-4" />}>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-[#0B0B0C] rounded border border-[#1F2226] text-center">
              <p className="text-lg font-semibold text-white">{healthData.restartTrends.last24h}</p>
              <p className="text-[10px] text-[#6B7280]">24h</p>
            </div>
            <div className="p-3 bg-[#0B0B0C] rounded border border-[#1F2226] text-center">
              <p className="text-lg font-semibold text-white">{healthData.restartTrends.last7d}</p>
              <p className="text-[10px] text-[#6B7280]">7d</p>
            </div>
            <div className={`p-3 rounded border text-center ${healthData.restartTrends.spike ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30' : 'bg-[#16C784]/10 border-[#16C784]/30'}`}>
              <p className={`text-lg font-semibold ${healthData.restartTrends.spike ? 'text-[#FF3B30]' : 'text-[#16C784]'}`}>{healthData.restartTrends.spike ? 'Spike' : 'Normal'}</p>
              <p className="text-[10px] text-[#6B7280]">Status</p>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-4 text-right">
        <span className="text-[10px] text-[#6B7280]">Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, subvalue }: { icon: React.ReactNode, label: string, value: number, subvalue: string }) {
  return (
    <div className="bg-[#111214] rounded-lg p-3 border border-[#1F2226]">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-[10px] text-[#6B7280]">{label}</span></div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-white">{value}</span>
        <span className="text-[10px] text-[#6B7280]">{subvalue}</span>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1F2226] flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
