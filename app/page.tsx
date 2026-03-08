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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Executive Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-green-400">System Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/tasks">
          <StatCard title="Active Tasks" value={activeTasks.toString()} change="+3" />
        </Link>
        <StatCard title="In Progress" value={inProgressTasks.toString()} change="+2" />
        <Link href="/approvals">
          <StatCard title="Pending Approvals" value={pendingApprovals.toString()} change="-1" />
        </Link>
        <Link href="/incidents">
          <StatCard title="Open Incidents" value={openIncidents.toString()} change="0" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Agent Fleet</h2>
            <div className="grid grid-cols-2 gap-4">
              {agents.slice(0, 8).map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className="text-gray-300">{agent.display_name || agent.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem text="Henry: Strategic planning session" time="2m ago" />
              <ActivityItem text="Optimus: Mission Control deployed" time="5m ago" />
              <ActivityItem text={`${agents.length} agents online`} time="Now" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <RealtimeStatus />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <p className="text-gray-400 text-sm">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-sm ${change.startsWith('+') ? 'text-green-400' : change.startsWith('-') ? 'text-red-400' : 'text-gray-500'}`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-300">{text}</span>
      <span className="text-gray-500 text-sm">{time}</span>
    </div>
  )
}
