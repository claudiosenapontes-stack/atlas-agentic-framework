import { getTasks } from '@/app/actions/tasks'
import { getCompanies } from '@/app/actions/companies'
import { getAgents } from '@/app/actions/agents'
import Link from 'next/link'
import { NewTaskButton } from './new-task-button'
import { CheckCircle2, Clock, AlertCircle, GitBranch, Users, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

/**
 * TASKS PAGE — Business Layer
 * 
 * Visual characteristics:
 * - Cleaner, structured workspace
 * - Clear hierarchy and organization
 * - Work management focused
 * - Calmer density than Operations
 * - Task-centric information architecture
 */

export default async function TasksPage() {
  const [tasks, companies, agents] = await Promise.all([
    getTasks(),
    getCompanies(),
    getAgents()
  ])

  // Task statistics
  const tasksByStatus = tasks.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const tasksByPriority = tasks.reduce((acc: any, t: any) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1
    return acc
  }, {})

  const inboxCount = tasksByStatus.inbox || 0
  const inProgressCount = tasksByStatus.in_progress || 0
  const completedCount = tasksByStatus.completed || 0
  const blockedCount = tasksByStatus.blocked || 0

  const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    inbox: { bg: 'bg-[#1F2226]', text: 'text-[#9BA3AF]', label: 'Inbox', dot: 'bg-[#6B7280]' },
    in_progress: { bg: 'bg-[#FFB020]/10', text: 'text-[#FFB020]', label: 'In Progress', dot: 'bg-[#FFB020]' },
    completed: { bg: 'bg-[#16C784]/10', text: 'text-[#16C784]', label: 'Completed', dot: 'bg-[#16C784]' },
    blocked: { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]', label: 'Blocked', dot: 'bg-[#FF3B30]' },
    planned: { bg: 'bg-[#1F2226]', text: 'text-[#9BA3AF]', label: 'Planned', dot: 'bg-[#6B7280]' },
    assigned: { bg: 'bg-[#1F2226]', text: 'text-[#9BA3AF]', label: 'Assigned', dot: 'bg-[#6B7280]' },
  }

  const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'text-[#6B7280]', label: 'Low' },
    medium: { color: 'text-[#9BA3AF]', label: 'Medium' },
    high: { color: 'text-[#FFB020]', label: 'High' },
    urgent: { color: 'text-[#FF3B30]', label: 'Urgent' },
  }

  return (
    <div className="space-y-4">
      {/* Header — Clean Business Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-white">Task Operations</h1>
          <p className="text-xs text-[#6B7280]">Work management and delegation</p>
        </div>
        <NewTaskButton companies={companies.map((c: any) => ({ id: c.id, name: c.name }))} />
      </div>

      {/* Queue Summary — Clean Metrics */}
      <div className="grid grid-cols-6 gap-3">
        <WorkMetric label="Inbox" value={inboxCount} dot="bg-[#6B7280]" />
        <WorkMetric label="Active" value={inProgressCount} dot="bg-[#FFB020]" />
        <WorkMetric label="Blocked" value={blockedCount} dot={blockedCount > 0 ? 'bg-[#FF3B30]' : 'bg-[#6B7280]'} />
        <WorkMetric label="Completed" value={completedCount} dot="bg-[#16C784]" />
        <WorkMetric label="Total" value={tasks.length} dot="bg-[#9BA3AF]" />
        <WorkMetric label="Agents" value={agents.length} dot="bg-[#16C784]" />
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-12 gap-4">
        {/* Task Table — Primary Work Surface */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider">Task Queue</h2>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />Inbox</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]" />Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />Blocked</span>
                </div>
              </div>
              <span className="text-[10px] text-[#6B7280]">{tasks.length} total</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0C]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">Task</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider w-28">Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider w-20">Priority</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2226]">
                  {tasks.slice(0, 20).map((task: any) => {
                    const status = statusConfig[task.status] || statusConfig.inbox
                    const priority = priorityConfig[task.priority] || priorityConfig.low
                    return (
                      <tr key={task.id} className="hover:bg-[#0B0B0C]/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/tasks/${task.id}`} className="text-xs text-white hover:text-[#9BA3AF] transition-colors block truncate max-w-[240px]">
                            {task.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                            <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#9BA3AF] truncate max-w-[120px]">
                          {task.assigned_agent?.display_name || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {tasks.length > 20 && (
              <div className="px-4 py-2 border-t border-[#1F2226] text-center">
                <span className="text-[10px] text-[#6B7280]">{tasks.length - 20} more tasks</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Work Context */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Status Distribution */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226]">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Status Distribution
              </h2>
            </div>
            <div className="p-3 space-y-2">
              {Object.entries(tasksByStatus).map(([status, count]: [string, any]) => {
                const config = statusConfig[status] || statusConfig.inbox
                const pct = Math.round((count / tasks.length) * 100)
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-xs text-[#9BA3AF] flex-1 capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-xs text-[#6B7280]">{count}</span>
                    <div className="w-16 h-1 bg-[#1F2226] rounded-full overflow-hidden">
                      <div className={`h-full ${config.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226]">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider">Priorities</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {Object.entries(tasksByPriority).map(([priority, count]: [string, any]) => {
                const config = priorityConfig[priority] || priorityConfig.low
                return (
                  <div key={priority} className="flex items-center justify-between p-2.5 bg-[#0B0B0C] rounded-lg">
                    <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-sm text-white font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5" />
                Delegation
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#16C784]/10 text-[#16C784]">Active</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#9BA3AF]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16C784]" />
                Multi-agent breakdown enabled
              </div>
              <Link href="/control" className="block text-[10px] text-[#6B7280] hover:text-white transition-colors">
                Open Control Center →
              </Link>
            </div>
          </div>

          {/* Agent Assignments */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226]">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Agent Capacity
              </h2>
            </div>
            <div className="p-2 space-y-1">
              {agents.slice(0, 6).map((agent: any) => {
                const agentTasks = tasks.filter((t: any) => t.assigned_agent_id === agent.id).length
                return (
                  <div key={agent.id} className="flex items-center justify-between p-2.5 bg-[#0B0B0C] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
                      <span className="text-xs text-white">{agent.display_name || agent.name}</span>
                    </div>
                    <span className="text-[10px] text-[#6B7280]">{agentTasks} tasks</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkMetric({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="bg-[#111214] rounded-[10px] p-3 border border-[#1F2226]">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-mono font-medium text-white mt-1">{value}</p>
    </div>
  )
}
