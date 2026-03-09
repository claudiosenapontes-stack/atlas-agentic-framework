"use client";

import { useState, useEffect } from 'react'
import { Activity, Server, Cpu, HardDrive, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ServiceStatus {
  name: string
  url: string
  status: 'online' | 'offline' | 'degraded'
  version?: string
  uptime?: string
  error?: string
}

interface InfrastructureStatus {
  services: ServiceStatus[]
  summary: {
    online: number
    total: number
    allOnline: boolean
  }
}

export default function HealthPage() {
  const [infraStatus, setInfraStatus] = useState<InfrastructureStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // PM2 services (mock data for now)
  const pm2Services = [
    { name: 'mc-gateway', status: 'online', cpu: '2%', memory: '45MB' },
    { name: 'mc-task-orchestrator', status: 'online', cpu: '3%', memory: '52MB' },
    { name: 'mc-heartbeat-reporter', status: 'online', cpu: '1%', memory: '32MB' },
    { name: 'mc-incident-watcher', status: 'online', cpu: '1%', memory: '35MB' },
    { name: 'mc-redis-queue-worker', status: 'online', cpu: '4%', memory: '55MB' },
  ]

  const fetchInfrastructureStatus = async () => {
    try {
      const response = await fetch('/api/infrastructure/status')
      const data = await response.json()
      if (data.success) {
        setInfraStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch infrastructure status:', err)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    fetchInfrastructureStatus()
    const interval = setInterval(fetchInfrastructureStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      default:
        return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  const allSystemsOperational = infraStatus?.summary.allOnline && pm2Services.every(s => s.status === 'online')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Health Center</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInfrastructureStatus}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            allSystemsOperational 
              ? 'bg-green-900/50 border border-green-800' 
              : 'bg-yellow-900/50 border border-yellow-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${allSystemsOperational ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className={allSystemsOperational ? 'text-green-400' : 'text-yellow-400'}>
              {allSystemsOperational ? 'All Systems Operational' : 'Some Services Degraded'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">{pm2Services.length}</div>
              <div className="text-sm text-gray-500">PM2 Services</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold">{infraStatus?.summary.online || 0}/{infraStatus?.summary.total || 4}</div>
              <div className="text-sm text-gray-500">Infra Services</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-orange-400" />
            <div>
              <div className="text-2xl font-bold">2.2%</div>
              <div className="text-sm text-gray-500">Avg CPU</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-cyan-400" />
            <div>
              <div className="text-2xl font-bold">219MB</div>
              <div className="text-sm text-gray-500">Total Memory</div>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure Services */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Infrastructure Services</h2>
          <span className="text-xs text-gray-500">Refreshed: {lastRefresh.toLocaleTimeString()}</span>
        </div>
        <div className="divide-y divide-gray-700">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
              Checking services...
            </div>
          ) : infraStatus?.services.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No infrastructure services configured
            </div>
          ) : (
            infraStatus?.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 hover:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-white capitalize">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.url}</p>
                    {service.error && (
                      <p className="text-xs text-red-400">{service.error}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    service.status === 'online' ? 'bg-green-500/20 text-green-400' :
                    service.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {service.status}
                  </span>
                  {service.version && service.version !== 'unknown' && (
                    <p className="text-xs text-gray-500 mt-1">v{service.version}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PM2 Services */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">PM2 Services</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Service</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">CPU</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {pm2Services.map((service) => (
                <tr key={service.name} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white">{service.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{service.cpu}</td>
                  <td className="px-4 py-3 text-gray-400">{service.memory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
