import { getTaskById, getExecutionsByTaskId } from '@/app/actions/tasks'
import { getAgents } from '@/app/actions/agents'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface TaskDetailPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const [task, executions, agents] = await Promise.all([
    getTaskById(params.id),
    getExecutionsByTaskId(params.id),
    getAgents()
  ])

  if (!task) {
    notFound()
  }

  const statusColors: Record<string, string> = {
    inbox: 'bg-gray-700',
    in_progress: 'bg-amber-700',
    completed: 'bg-green-700',
    blocked: 'bg-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link href="/tasks" className="text-blue-400 hover:text-blue-300">
        ← Back to Tasks
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className={`px-2 py-1 rounded text-white ${statusColors[task.status] || 'bg-gray-700'}`}>
              {task.status}
            </span>
            {task.company && <span>{task.company.name}</span>}
            <span>Created {formatDistanceToNow(new Date(task.created_at))} ago</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Pane */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-300">{task.description || 'No description provided.'}</p>
          </div>

          {/* Executions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Executions ({executions.length})</h2>
            {executions.length === 0 ? (
              <p className="text-gray-500">No executions yet.</p>
            ) : (
              <div className="space-y-3">
                {executions.map((execution: any) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <div>
                      <span className={`text-sm font-medium ${
                        execution.status === 'succeeded' ? 'text-green-400' :
                        execution.status === 'failed' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {execution.status}
                      </span>
                      <p className="text-xs text-gray-500">
                        Agent: {execution.agent?.display_name || execution.agent?.name || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {execution.started_at && formatDistanceToNow(new Date(execution.started_at))} ago
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata Pane */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Ownership</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Assigned To</p>
                <p className="text-white">{task.assigned_agent?.display_name || 'Unassigned'}</p>
              </div>
              {task.executive_owner && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Executive Owner</p>
                  <p className="text-white">{task.executive_owner.display_name}</p>
                </div>
              )}
            </div>
          </div>

          {task.approval_required && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">Approval</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                task.approval_status === 'approved' ? 'bg-green-900/50 text-green-400' :
                task.approval_status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                'bg-amber-900/50 text-amber-400'
              }`}>
                {task.approval_status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
