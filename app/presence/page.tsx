import { getAllPresence } from '@/lib/redis'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function PresencePage() {
  const presence = await getAllPresence()

  const agents = [
    { name: 'henry', displayName: 'Henry', role: 'CEO', statusColor: 'bg-blue-500' },
    { name: 'olivia', displayName: 'Olivia', role: 'Executive Assistant', statusColor: 'bg-purple-500' },
    { name: 'harvey', displayName: 'Harvey', role: 'Finance', statusColor: 'bg-green-500' },
    { name: 'sophia', displayName: 'Sophia', role: 'Marketing', statusColor: 'bg-pink-500' },
    { name: 'einstein', displayName: 'Einstein', role: 'Research', statusColor: 'bg-amber-500' },
    { name: 'optimus', displayName: 'Optimus', role: 'Tech Lead', statusColor: 'bg-red-500' },
    { name: 'prime', displayName: 'Prime', role: 'Senior Dev', statusColor: 'bg-cyan-500' },
    { name: 'severino', displayName: 'Severino', role: 'Operations', statusColor: 'bg-orange-500' },
  ]

  const activeAgents = Object.keys(presence).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Presence</h1>
          <p className="text-gray-400">Live agent status and activity monitoring</p>
        </div>
        <div className="bg-green-900/50 border border-green-700 px-6 py-4 rounded-lg">
          <div className="text-3xl font-bold text-white">{activeAgents}/{agents.length}</div>
          <div className="text-sm text-green-400">Agents Online</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const pres = presence[agent.name]
          const isOnline = pres && pres.status === 'online'
          const lastSeen = pres?.last_seen
          const currentTask = pres?.current_task

          return (
            <div key={agent.name} className={`bg-gray-800 rounded-lg p-4 border ${isOnline ? 'border-green-600' : 'border-gray-700'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${agent.statusColor} flex items-center justify-center`}>
                  <span className="font-bold text-white">{agent.name[0].toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{agent.displayName}</h3>
                  <p className="text-xs text-gray-500">{agent.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {lastSeen && (
                  <div className="text-xs text-gray-500">
                    Last seen: {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
                  </div>
                )}

                {currentTask && currentTask !== '' && (
                  <div className="text-xs text-blue-400">
                    Task: {currentTask}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold text-green-400">{activeAgents}</div>
            <div className="text-sm text-gray-400">Online</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">{agents.length - activeAgents}</div>
            <div className="text-sm text-gray-400">Offline</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">
              {Object.values(presence).filter((p: any) => p?.current_task).length}
            </div>
            <div className="text-sm text-gray-400">Busy</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">
              {activeAgents - Object.values(presence).filter((p: any) => p?.current_task).length}
            </div>
            <div className="text-sm text-gray-400">Idle</div>
          </div>
        </div>
      </div>
    </div>
  )
}
