import { getTasks } from '@/app/actions/tasks'
import { getAgents } from '@/app/actions/agents'
import { getApprovals } from '@/app/actions/approvals'
import { getIncidents } from '@/app/actions/incidents'
import { RealtimeStatus } from '@/components/realtime-status'
import { PredictiveAnalytics } from '@/app/components/predictive-analytics'
import { AutoOptimizer } from '@/app/components/auto-optimizer'
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">Executive Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-green-700 text-sm sm:text-base font-medium">System Operational</span>
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
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-800">Agent Fleet</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {agents.slice(0, 6).map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  <span className="text-slate-600 text-sm truncate">{agent.display_name || agent.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-stone-200 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-stone-900">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem text="Henry: Strategic planning session" time="2m ago" />
              <ActivityItem text="Optimus: Mission Control deployed" time="5m ago" />
              <ActivityItem text={`${agents.length} agents online`} time="Now" />
            </div>
          </div>
        </div>

        {/* Sidebar - Full width on mobile */}
        <div className="space-y-4 sm:space-y-6">
          <PredictiveAnalytics />
          <AutoOptimizer />
          <RealtimeStatus />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all shadow-sm">
      <p className="text-stone-500 text-xs sm:text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl sm:text-2xl font-bold text-stone-900">{value}</span>
        <span className={`text-xs sm:text-sm font-medium ${change.startsWith('+') ? 'text-green-700' : change.startsWith('-') ? 'text-red-700' : 'text-stone-400'}`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <span className="text-stone-700 text-sm truncate mr-2">{text}</span>
      <span className="text-stone-400 text-xs sm:text-sm flex-shrink-0">{time}</span>
    </div>
  )
}
