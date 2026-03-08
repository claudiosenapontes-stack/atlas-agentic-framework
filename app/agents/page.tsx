import { getAgents } from '@/app/actions/agents'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Agent Fleet</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent: any) => (
          <div key={agent.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{agent.display_name || agent.name}</h3>
              <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            </div>
            <p className="text-gray-400 text-sm">{agent.role}</p>
            {agent.delegation_level && (
              <p className="text-blue-400 text-xs mt-2 capitalize">{agent.delegation_level}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
