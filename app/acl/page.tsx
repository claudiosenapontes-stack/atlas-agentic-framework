import { getACLRules, seedDefaultACLRules } from '@/app/actions/acl'
import { getAgents } from '@/app/actions/agents'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ACLPage() {
  const [rules, agents] = await Promise.all([
    getACLRules(),
    getAgents()
  ])

  const agentsById = Object.fromEntries(agents.map((a: any) => [a.id, a]))

  const resourceTypes = ['agent', 'company', 'task', 'execution', 'communication', 'approval', 'incident']
  const subjectTypes = ['agent', 'role', 'company']
  const permissions = ['none', 'read', 'write', 'execute', 'admin']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Access Control</h1>
          <p className="text-gray-400">Manage permissions across the Atlas Agentic Framework</p>
        </div>
        <div className="flex gap-2">
          <form action={async () => {
            'use server'
            await seedDefaultACLRules()
          }}>
            <button type="submit" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium">
              Seed Defaults
            </button>
          </form>
          <Link href="/acl/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
            + New Rule
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{rules.length}</div>
          <div className="text-sm text-gray-400">Total Rules</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">
            {rules.filter((r: any) => r.permission === 'admin').length}
          </div>
          <div className="text-sm text-gray-400">Admin Rules</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">
            {new Set(rules.map((r: any) => r.subject_id)).size}
          </div>
          <div className="text-sm text-gray-400">Active Subjects</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-amber-400">
            {rules.filter((r: any) => r.expires_at && new Date(r.expires_at) < new Date()).length}
          </div>
          <div className="text-sm text-gray-400">Expired</div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Resource</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Permission</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rules.map((rule: any) => {
              const isExpired = rule.expires_at && new Date(rule.expires_at) < new Date()
              const agent = agentsById[rule.subject_id]
              
              return (
                <tr key={rule.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="text-white">{rule.resource_type}</div>
                    {rule.resource_id && (
                      <div className="text-xs text-gray-500">{rule.resource_id.slice(0, 8)}...</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {agent && (
                        <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                      )}
                      <span className="text-white">{agent?.display_name || rule.subject_id}</span>
                    </div>
                    <div className="text-xs text-gray-500">{rule.subject_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.permission === 'admin' ? 'bg-purple-700 text-white' :
                      rule.permission === 'execute' ? 'bg-blue-700 text-white' :
                      rule.permission === 'write' ? 'bg-green-700 text-white' :
                      rule.permission === 'read' ? 'bg-gray-700 text-white' :
                      'bg-red-700/50 text-red-200'
                    }`}>
                      {rule.permission}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{rule.priority}</td>
                  <td className="px-4 py-3">
                    {isExpired ? (
                      <span className="text-red-400 text-sm">Expired</span>
                    ) : rule.expires_at ? (
                      <span className="text-amber-400 text-sm">Expires {new Date(rule.expires_at).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-green-400 text-sm">Active</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
