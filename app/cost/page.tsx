import { getAgents } from '@/app/actions/agents'
import { getTasks } from '@/app/actions/tasks'
import Link from 'next/link'
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Users, 
  Activity,
  Zap,
  BarChart3,
  ArrowRight
} from 'lucide-react'

export const dynamic = 'force-dynamic'

/**
 * COST PAGE — Business Layer
 * 
 * Visual characteristics:
 * - Clean, structured analytics view
 * - Financial data visualization
 * - Cost breakdown by agent, workflow, model
 * - Waste identification (retries/failures)
 */

// Mock cost data — replace with real API when available
const mockCostData = {
  daily: 12.45,
  monthly: 847.23,
  monthlyBudget: 2000,
  trend: '+8.2%',
  
  byAgent: [
    { name: 'Henry', cost: 234.50, tasks: 45, efficiency: 94 },
    { name: 'Optimus', cost: 198.30, tasks: 38, efficiency: 91 },
    { name: 'Prime', cost: 156.20, tasks: 62, efficiency: 88 },
    { name: 'Severino', cost: 89.40, tasks: 28, efficiency: 96 },
  ],
  
  byModel: [
    { name: 'Kimi K2.5', cost: 523.40, percent: 62, color: '#FF6A00' },
    { name: 'Kimi K2', cost: 289.80, percent: 34, color: '#9BA3AF' },
    { name: 'Other', cost: 34.03, percent: 4, color: '#6B7280' },
  ],
  
  waste: {
    retries: 45.20,
    failures: 23.80,
    total: 69.00,
    percent: 8.1
  },
  
  dailyHistory: [
    { date: 'Mon', cost: 11.20 },
    { date: 'Tue', cost: 13.40 },
    { date: 'Wed', cost: 10.80 },
    { date: 'Thu', cost: 14.20 },
    { date: 'Fri', cost: 12.45 },
    { date: 'Sat', cost: 8.30 },
    { date: 'Sun', cost: 9.10 },
  ]
}

export default async function CostPage() {
  const [agents, tasks] = await Promise.all([
    getAgents(),
    getTasks()
  ])

  const budgetPercent = Math.round((mockCostData.monthly / mockCostData.monthlyBudget) * 100)

  return (
    <div className="space-y-6">
      {/* Header — Business Layer with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2226]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">Cost Observatory</h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#9BA3AF]/10 text-[#9BA3AF] border border-[#9BA3AF]/30 uppercase tracking-wider">Business</span>
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">Token usage and spend analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Layer Navigation */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111214] border border-[#1F2226]">
            <Link href="/" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">System</Link>
            <span className="text-[#1F2226]">/</span>
            <Link href="/control" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Control</Link>
            <span className="text-[#1F2226]">/</span>
            <Link href="/tasks" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Tasks</Link>
            <span className="text-[#1F2226]">/</span>
            <span className="px-2 py-1 rounded text-[10px] text-white bg-[#1F2226]">Cost</span>
          </div>
          <Link 
            href="/control" 
            className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Live Monitor
          </Link>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-3">
        <CostMetric 
          label="Today" 
          value={`$${mockCostData.daily.toFixed(2)}`} 
          trend="+12%"
          trendUp={true}
        />
        <CostMetric 
          label="This Month" 
          value={`$${mockCostData.monthly.toFixed(2)}`} 
          trend={mockCostData.trend}
          trendUp={true}
        />
        <CostMetric 
          label="Budget Used" 
          value={`${budgetPercent}%`} 
          alert={budgetPercent > 75}
        />
        <CostMetric 
          label="Waste" 
          value={`$${mockCostData.waste.total.toFixed(2)}`} 
          trend={`${mockCostData.waste.percent}%`}
          trendUp={false}
          critical={mockCostData.waste.percent > 10}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Daily Trend */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Daily Spend Trend
              </h2>
              <span className="text-[10px] text-[#6B7280]">Last 7 days</span>
            </div>
            <div className="p-4">
              <div className="flex items-end justify-between h-32 gap-2">
                {mockCostData.dailyHistory.map((day, i) => {
                  const maxCost = Math.max(...mockCostData.dailyHistory.map(d => d.cost))
                  const height = (day.cost / maxCost) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-[#FF6A00]/20 rounded-t-sm relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-[#FF6A00] rounded-t-sm transition-all"
                          style={{ height: '100%' }}
                        />
                      </div>
                      <span className="text-[10px] text-[#6B7280]">{day.date}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Costly Agents */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226]">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Top Costly Agents
              </h2>
            </div>
            <div className="divide-y divide-[#1F2226]">
              {mockCostData.byAgent.map((agent, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-[#0B0B0C]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[#1F2226] flex items-center justify-center text-[10px] text-[#6B7280]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-white font-medium">{agent.name}</p>
                      <p className="text-[10px] text-[#6B7280]">{agent.tasks} tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-white font-mono">${agent.cost.toFixed(2)}</p>
                      <p className={`text-[10px] ${agent.efficiency > 90 ? 'text-[#16C784]' : 'text-[#FFB020]'}`}>
                        {agent.efficiency}% efficiency
                      </p>
                    </div>
                    <div className="w-24 h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#FF6A00] rounded-full"
                        style={{ width: `${(agent.cost / 250) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Model Split */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226]">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Model Split
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {mockCostData.byModel.map((model, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9BA3AF]">{model.name}</span>
                    <span className="text-white font-mono">${model.cost.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${model.percent}%`, backgroundColor: model.color }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#6B7280]">{model.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waste Breakdown */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Waste Analysis
              </h2>
              {mockCostData.waste.percent > 10 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF3B30]/10 text-[#FF3B30]">
                  High
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <WasteItem 
                label="Retry Costs" 
                cost={mockCostData.waste.retries}
                total={mockCostData.monthly}
              />
              <WasteItem 
                label="Failed Tasks" 
                cost={mockCostData.waste.failures}
                total={mockCostData.monthly}
              />
              <div className="pt-3 border-t border-[#1F2226]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9BA3AF]">Total Waste</span>
                  <span className="text-sm text-[#FF3B30] font-mono">
                    ${mockCostData.waste.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
            <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3">
              Actions
            </h2>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between px-3 py-2 bg-[#0B0B0C] rounded-lg text-xs text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] transition-colors">
                <span>View Agent Efficiency</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2 bg-[#0B0B0C] rounded-lg text-xs text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] transition-colors">
                <span>Export Report</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CostMetric({ 
  label, 
  value, 
  trend, 
  trendUp,
  alert,
  critical 
}: { 
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  alert?: boolean
  critical?: boolean
}) {
  const valueColor = critical ? 'text-[#FF3B30]' : alert ? 'text-[#FFB020]' : 'text-white'
  
  return (
    <div className="bg-[#111214] rounded-[10px] p-4 border border-[#1F2226]">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="w-3.5 h-3.5 text-[#6B7280]" />
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-mono font-medium ${valueColor}`}>{value}</p>
      {trend && (
        <p className={`text-[10px] mt-1 flex items-center gap-1 ${
          critical ? 'text-[#FF3B30]' : 
          alert ? 'text-[#FFB020]' : 
          trendUp ? 'text-[#16C784]' : 'text-[#FF3B30]'
        }`}>
          <TrendingUp className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} />
          {trend} vs last period
        </p>
      )}
    </div>
  )
}

function WasteItem({ label, cost, total }: { label: string; cost: number; total: number }) {
  const percent = (cost / total) * 100
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#9BA3AF]">{label}</span>
        <span className="text-white font-mono">${cost.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-[#1F2226] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#FF3B30] rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-right">
        <span className="text-[10px] text-[#6B7280]">{percent.toFixed(1)}%</span>
      </div>
    </div>
  )
}
