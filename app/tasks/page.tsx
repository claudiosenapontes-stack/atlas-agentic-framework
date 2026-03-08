import { getTasks } from '@/app/actions/tasks'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const tasks = await getTasks()

  const statusColors: Record<string, string> = {
    inbox: 'bg-gray-700',
    in_progress: 'bg-amber-700',
    completed: 'bg-green-700',
    blocked: 'bg-red-700',
    planned: 'bg-blue-700',
    assigned: 'bg-cyan-700',
  }

  const priorityColors: Record<string, string> = {
    low: 'text-gray-400',
    medium: 'text-blue-400',
    high: 'text-amber-400',
    urgent: 'text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-400">Manage tasks across the AI network</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
          + New Task
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Task</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Assignee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {tasks.map((task: any) => (
              <tr key={task.id} className="hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <Link href={`/tasks/${task.id}`} className="text-white hover:text-blue-400">
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[task.status] || 'bg-gray-700'}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {task.assigned_agent?.display_name || 'Unassigned'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${priorityColors[task.priority] || 'text-gray-400'}`}>
                    {task.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
