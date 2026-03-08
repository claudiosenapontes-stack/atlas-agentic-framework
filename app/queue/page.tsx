import { getAllQueueDepths } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export default async function QueuePage() {
  const queues = await getAllQueueDepths()
  const totalTasks = Object.values(queues).reduce((a: number, b: number) => a + b, 0)

  const agents = [
    { name: 'henry', displayName: 'Henry', role: 'CEO' },
    { name: 'olivia', displayName: 'Olivia', role: 'Executive Assistant' },
    { name: 'harvey', displayName: 'Harvey', role: 'Finance' },
    { name: 'sophia', displayName: 'Sophia', role: 'Marketing' },
    { name: 'einstein', displayName: 'Einstein', role: 'Research' },
    { name: 'optimus', displayName: 'Optimus', role: 'Tech Lead' },
    { name: 'prime', displayName: 'Prime', role: 'Senior Dev' },
    { name: 'severino', displayName: 'Severino', role: 'Operations' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Queues</h1>
          <p className="text-gray-400">Monitor workload distribution across agents</p>
        </div>
        <div className="bg-blue-900/50 border border-blue-700 px-6 py-4 rounded-lg">
          <div className="text-3xl font-bold text-white">{totalTasks}</div>
          <div className="text-sm text-blue-400">Total Tasks Queued</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const depth = queues[`queue:tasks:${agent.name}`] || 0
          const urgency = depth > 10 ? 'high' : depth > 5 ? 'medium' : 'low'
          
          return (
            <div key={agent.name} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="font-bold text-gray-300">{agent.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.displayName}</h3>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <span className={`w-3 h-3 rounded-full ${
                  urgency === 'high' ? 'bg-red-500' :
                  urgency === 'medium' ? 'bg-amber-500' :
                  'bg-green-500'
                }`} />
              </div>
              
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{depth}</span>
                  <span className="text-sm text-gray-500">tasks</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      urgency === 'high' ? 'bg-red-500' :
                      urgency === 'medium' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(depth * 10, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">System Queues</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">{queues['queue:incidents'] || 0}</div>
            <div className="text-sm text-gray-400">Incidents</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">{queues['queue:approvals'] || 0}</div>
            <div className="text-sm text-gray-400">Approvals</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-2xl font-bold">{queues['queue:retries'] || 0}</div>
            <div className="text-sm text-gray-400">Retries</div>
          </div>
        </div>
      </div>
    </div>
  )
}
