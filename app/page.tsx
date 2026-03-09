import { getTasks } from '@/app/actions/tasks'
import { getAgents } from '@/app/actions/agents'
import { getApprovals } from '@/app/actions/approvals'
import { getIncidents } from '@/app/actions/incidents'
import { RealtimeStatus } from '@/components/realtime-status'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [tasks, agents, approvals, incidents] = await Promise.all([
    getTasks(),
    getAgents(),
    getApprovals(),
    getIncidents()
  ])

  const activeTasks = tasks.filter((t: any) => !['completed', 'archived', 'canceled'].includes(t.status)).length
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
  const pendingApprovals = approvals.filter((a: any) => a.status === 'pending').length
  const openIncidents = incidents.filter((i: any) => ['open', 'in_progress'].includes(i.status)).length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Executive Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-green-400 text-sm sm:text-base">System Operational</span>
        </div>
      </div>

      {/* Stats Grid - Stacks on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/tasks">
          <StatCard title="Active Tasks" value={activeTasks.toString()} change="+3" />
        </Link>
        <Link href="/tasks">
          <StatCard title="In Progress" value={inProgressTasks.toString()} change="+2" />
        </Link>
        <Link href="/approvals">
          <StatCard title="Pending Approvals" value={pendingApprovals.toString()} change="-1" />
        </Link>
        <Link href="/incidents">
          <StatCard title="Open Incidents" value={openIncidents.toString()} change="0" />
        </Link>
      </div>

      {/* Main Content - Stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Agent Fleet */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Agent Fleet</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {agents.slice(0, 6).map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className="text-gray-300 text-sm truncate">{agent.display_name || agent.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem text="Henry: Strategic planning session" time="2m ago" />
              <ActivityItem text="Optimus: Mission Control deployed" time="5m ago" />
              <ActivityItem text={`${agents.length} agents online`} time="Now" />
            </div>
          </div>
        </div>

        {/* Sidebar - Full width on mobile */}
        <div className="space-y-4 sm:space-y-6">
          <RealtimeStatus />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <p className="text-gray-400 text-xs sm:text-sm">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl sm:text-2xl font-bold">{value}</span>
        <span className={`text-xs sm:text-sm ${change.startsWith('+') ? 'text-green-400' : change.startsWith('-') ? 'text-red-400' : 'text-gray-500'}`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-300 text-sm truncate mr-2">{text}</span>
      <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0">{time}</span>
    </div>
  )
}
