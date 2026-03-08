import { getExecutions, getExecutionStats } from '@/app/actions/executions'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ExecutionsPage() {
  const [executions, stats] = await Promise.all([
    getExecutions(100),
    getExecutionStats(),
  ])

  const statusColors: Record<string, string> = {
    running: 'text-blue-400',
    succeeded: 'text-green-400',
    failed: 'text-red-400',
    escalated: 'text-amber-400',
    queued: 'text-gray-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="text-gray-400">Runtime execution tracking and logs</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-green-900/50 border border-green-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold text-green-400">{stats.succeeded}</div>
            <div className="text-xs text-green-500">Success</div>
          </div>
          <div className="bg-red-900/50 border border-red-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-red-500">Failed</div>
          </div>
          <div className="bg-blue-900/50 border border-blue-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-400">{stats.running}</div>
            <div className="text-xs text-blue-500">Running</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Task</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Agent</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Step</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Started</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {executions.map((exec: any) => (
              <tr key={exec.id} className="hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-2 ${statusColors[exec.status] || 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${
                      exec.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      exec.status === 'succeeded' ? 'bg-green-500' :
                      exec.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`} />
                    {exec.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-white">
                  {exec.task?.title || 'Unknown Task'}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {exec.agent?.display_name || exec.agent?.name || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {exec.step || '-'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {exec.started_at ? formatDistanceToNow(new Date(exec.started_at), { addSuffix: true }) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">
                  {exec.result_summary || exec.error_summary || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
