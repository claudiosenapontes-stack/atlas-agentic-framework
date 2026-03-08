import { Activity, Server, Cpu, HardDrive } from 'lucide-react'

export default function HealthPage() {
  const services = [
    { name: 'mc-gateway', status: 'online', cpu: '2%', memory: '45MB' },
    { name: 'mc-task-orchestrator', status: 'online', cpu: '3%', memory: '52MB' },
    { name: 'mc-heartbeat-reporter', status: 'online', cpu: '1%', memory: '32MB' },
    { name: 'mc-incident-watcher', status: 'online', cpu: '1%', memory: '35MB' },
    { name: 'mc-redis-queue-worker', status: 'online', cpu: '4%', memory: '55MB' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Health Center</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-900/50 border border-green-800 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-green-400">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">{services.length}</div>
              <div className="text-sm text-gray-500">Services Online</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">2.2%</div>
              <div className="text-sm text-gray-500">Avg CPU</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">219MB</div>
              <div className="text-sm text-gray-500">Total Memory</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-500">Queue Depth</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">PM2 Services</h2>
        </div>
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
            {services.map((service) => (
              <tr key={service.name}>
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
  )
}
