import { getTasks } from '@/app/actions/tasks'
import { getAgents } from '@/app/actions/agents'
import { getApprovals } from '@/app/actions/approvals'
import { getIncidents } from '@/app/actions/incidents'
import { getCompanies } from '@/app/actions/companies'
import Link from 'next/link'
import { Building2, CheckCircle2, Clock, AlertCircle, Activity, DollarSign, LayoutDashboard, GitBranch } from 'lucide-react'

export const dynamic = 'force-dynamic'

/**
 * DASHBOARD PAGE — System Layer
 * 
 * Visual characteristics:
 * - Darker, quieter, diagnostic
 * - Deep backgrounds (#0B0B0C cards)
 * - Muted borders, reduced contrast
 * - Smaller text, system-focused
 * - Status overview without action density
 */

export default async function DashboardPage() {
  const [tasks, agents, approvals, incidents, companies] = await Promise.all([
    getTasks(),
    getAgents(),
    getApprovals(),
    getIncidents(),
    getCompanies()
  ])

  const activeTasks = tasks.filter((t: any) => !['completed', 'archived', 'canceled'].includes(t.status)).length
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
  const pendingApprovals = approvals.filter((a: any) => a.status === 'pending').length
  const openIncidents = incidents.filter((i: any) => ['open', 'in_progress'].includes(i.status)).length
  
  const activeAgents = agents.filter((a: any) => a.status === 'active')

  return (
    <div className="space-y-4">
      {/* Header — System Layer with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1F2226]/50">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-medium text-white">System Overview</h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/30 uppercase tracking-wider">System</span>
            </div>
            <p className="text-xs text-[#4B5563]">Diagnostic dashboard — Atlas health & status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Layer Navigation */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B0B0C] border border-[#1F2226]/50">
            <span className="px-2 py-1 rounded text-[10px] text-white bg-[#1F2226]">System</span>
            <span className="text-[#1F2226]">/</span>
            <Link href="/control" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Control</Link>
            <span className="text-[#1F2226]">/</span>
            <Link href="/tasks" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Tasks</Link>
            <span className="text-[#1F2226]">/</span>
            <Link href="/cost" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Cost</Link>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0B0B0C] border border-[#1F2226]/50">
            <Activity className="w-3 h-3 text-[#16C784]" />
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Health</span>
            <span className="text-[10px] text-[#16C784]">Healthy</span>
          </div>
        </div>
      </div>

      {/* Quiet Stats Row — Subdued */}
      <div className="grid grid-cols-5 gap-3">
        <SystemMetric label="Active Tasks" value={activeTasks} />
        <SystemMetric label="In Progress" value={inProgressTasks} />
        <SystemMetric label="Pending Approval" value={pendingApprovals} alert={pendingApprovals > 0} />
        <SystemMetric label="Open Incidents" value={openIncidents} alert={openIncidents > 0} critical={openIncidents > 0} />
        <CostMetric />
      </div>

      {/* Main Grid — Quiet System View */}
      <div className="grid grid-cols-12 gap-4">
        {/* Agent Fleet — System Status */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#0B0B0C] rounded-[10px] border border-[#1F2226]/50">
            <div className="px-4 py-3 border-b border-[#1F2226]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#16C784]" />
                <h2 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Agent Fleet</h2>
              </div>
              <span className="text-[10px] text-[#4B5563]">{activeAgents.length} active</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {agents.map((agent: any) => (
                  <Link 
                    key={agent.id} 
                    href={`/agents`}
                    className="flex items-center gap-2 p-2 rounded bg-[#111214]/50 border border-[#1F2226]/30 hover:border-[#1F2226] transition-colors"
                  >
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${agent.status === 'active' ? 'bg-[#16C784]' : 'bg-[#4B5563]'}`} />
                    <span className="text-[11px] text-[#9BA3AF] truncate">{agent.display_name || agent.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Companies — Quiet List */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#0B0B0C] rounded-[10px] border border-[#1F2226]/50 h-full">
            <div className="px-4 py-3 border-b border-[#1F2226]/50">
              <h2 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Companies</h2>
            </div>
            <div className="p-2 space-y-1">
              {companies.slice(0, 6).map((company: any) => (
                <Link 
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[#111214]/50 transition-colors"
                >
                  <Building2 className="w-3 h-3 text-[#4B5563]" />
                  <span className="text-xs text-[#9BA3AF] flex-1 truncate">{company.name}</span>
                  {company.status === 'active' && <span className="w-1 h-1 rounded-full bg-[#16C784]" />}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* System Links — Layer Navigation */}
        <div className="col-span-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SystemLink href="/control" label="Control" status="operational" layer="Operations" />
            <SystemLink href="/tasks" label="Tasks" status="neutral" layer="Business" />
            <SystemLink href="/agents" label="Fleet" status="neutral" layer="System" />
            <SystemLink href="/cost" label="Cost" status="neutral" layer="Business" />
            <SystemLink href="/approvals" label="Approvals" count={pendingApprovals} alert={pendingApprovals > 0} layer="Business" />
            <SystemLink href="/incidents" label="Incidents" count={openIncidents} alert={openIncidents > 0} critical={openIncidents > 0} layer="System" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemMetric({ label, value, alert, critical }: { label: string; value: number; alert?: boolean; critical?: boolean }) {
  return (
    <div className="bg-[#0B0B0C] rounded-[10px] p-3 border border-[#1F2226]/50">
      <p className="text-[10px] text-[#4B5563] uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-medium mt-1 ${critical ? 'text-[#FF3B30]' : alert ? 'text-[#FFB020]' : 'text-[#9BA3AF]'}`}>
        {value}
      </p>
    </div>
  )
}

function SystemLink({ 
  href, 
  label, 
  status = 'neutral',
  layer,
  count,
  alert,
  critical 
}: { 
  href: string; 
  label: string; 
  status?: 'operational' | 'neutral';
  layer?: string;
  count?: number;
  alert?: boolean;
  critical?: boolean;
}) {
  const dotColor = critical ? 'bg-[#FF3B30]' : alert ? 'bg-[#FFB020]' : status === 'operational' ? 'bg-[#16C784]' : 'bg-[#4B5563]'
  const layerColor = layer === 'System' ? 'text-[#16C784]' : layer === 'Operations' ? 'text-[#FFB020]' : 'text-[#9BA3AF]'
  
  return (
    <Link 
      href={href} 
      className="group flex flex-col p-3 bg-[#0B0B0C] rounded-[10px] border border-[#1F2226]/50 hover:border-[#1F2226] hover:bg-[#111214] transition-all duration-150"
    >
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-xs text-[#9BA3AF] group-hover:text-white transition-colors">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] font-mono ml-auto ${critical ? 'text-[#FF3B30]' : alert ? 'text-[#FFB020]' : 'text-[#6B7280]'}`}>
            {count}
          </span>
        )}
      </div>
      {layer && (
        <span className={`text-[9px] mt-1.5 ml-3.5 ${layerColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
          {layer} Layer
        </span>
      )}
    </Link>
  )
}

function CostMetric() {
  // Mock data — replace with real API
  const dailyCost = 12.45
  const budgetPercent = 42
  
  return (
    <Link href="/cost" className="block bg-[#0B0B0C] rounded-[10px] p-3 border border-[#1F2226]/50 hover:border-[#1F2226] transition-colors">
      <div className="flex items-center gap-2">
        <DollarSign className="w-3 h-3 text-[#6B7280]" />
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Daily Cost</span>
      </div>
      <p className="text-lg font-mono font-medium text-white mt-1">${dailyCost}</p>
      <div className="mt-2 h-1 bg-[#1F2226] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#FF6A00] rounded-full"
          style={{ width: `${budgetPercent}%` }}
        />
      </div>
    </Link>
  )
}
