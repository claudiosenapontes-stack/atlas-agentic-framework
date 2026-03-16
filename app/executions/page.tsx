import { getExecutions, getExecutionStats } from '@/app/actions/executions'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import { Zap, GitBranch, Clock, CheckCircle2, XCircle, AlertCircle, Play, ArrowRight, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExecutionsPage() {
  const [executions, stats] = await Promise.all([
    getExecutions(100),
    getExecutionStats(),
  ])

  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    running: { color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]', icon: Play },
    succeeded: { color: 'text-[#16C784]', bg: 'bg-[#16C784]', icon: CheckCircle2 },
    failed: { color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]', icon: XCircle },
    escalated: { color: 'text-[#FFB020]', bg: 'bg-[#FFB020]', icon: AlertCircle },
    queued: { color: 'text-[#6B7280]', bg: 'bg-[#6B7280]', icon: Clock },
    retrying: { color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]', icon: Zap },
  }

  // Group executions by parent for hierarchy
  const parentExecutions = executions.filter((e: any) => !e.parent_execution_id)
  const childExecutions = executions.filter((e: any) => e.parent_execution_id)

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Executions</h1>
            <p className="text-xs text-[#6B7280]">Runtime execution tracking and recovery</p>
          </div>
          <div className="flex gap-3">
            <StatCard label="Success" value={stats.succeeded} color="green" />
            <StatCard label="Failed" value={stats.failed} color="red" />
            <StatCard label="Running" value={stats.running} color="blue" />
            <StatCard label="Total" value={stats.total} color="neutral" />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {parentExecutions.map((exec: any) => {
          const children = childExecutions.filter((c: any) => c.parent_execution_id === exec.id)
          const config = statusConfig[exec.status] || statusConfig.queued
          const Icon = config.icon
          
          return (
            <div key={exec.id} className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
              {/* Main Execution Row */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${config.bg}/10 flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B7280] font-mono">{exec.id.slice(0, 8)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bg}/20 ${config.color}`}>{exec.status}</span>
                        {exec.retry_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6]">{exec.retry_count} retries</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white mt-1">{exec.task?.title || 'Unknown Task'}</h3>
                      <p className="text-xs text-[#6B7280]">Agent: {exec.agent?.display_name || exec.agent?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B7280]">{exec.started_at ? formatDistanceToNow(new Date(exec.started_at), { addSuffix: true }) : '-'}</p>
                    <p className="text-[10px] text-[#6B7280]">{exec.started_at ? format(new Date(exec.started_at), 'MMM d, HH:mm') : '-'}</p>
                  </div>
                </div>

                {/* Step Timeline */}
                {exec.steps && exec.steps.length > 0 && (
                  <div className="mt-4 pl-11">
                    <p className="text-[10px] text-[#6B7280] uppercase mb-2">Step Timeline</p>
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {exec.steps.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                          <div className={`px-2 py-1 rounded text-[10px] ${
                            step.status === 'completed' ? 'bg-[#16C784]/10 text-[#16C784]' :
                            step.status === 'failed' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                            'bg-[#6B7280]/10 text-[#6B7280]'
                          }`}>
                            {step.name}
                          </div>
                          {idx < exec.steps.length - 1 && <ArrowRight className="w-3 h-3 text-[#6B7280]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retry/Recovery State */}
                {exec.retry_state && (
                  <div className="mt-3 pl-11 p-2 bg-[#8B5CF6]/5 rounded border border-[#8B5CF6]/20">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-[#8B5CF6]" />
                      <span className="text-xs text-[#8B5CF6]">Recovery Mode</span>
                      <span className="text-[10px] text-[#6B7280]">Attempt {exec.retry_state.attempt} of {exec.retry_state.max_attempts}</span>
                    </div>
                  </div>
                )}

                {/* Result Summary */}
                {exec.result_summary && (
                  <div className="mt-3 pl-11 p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                    <p className="text-xs text-[#9BA3AF]">{exec.result_summary}</p>
                  </div>
                )}
              </div>

              {/* Child Executions */}
              {children.length > 0 && (
                <div className="border-t border-[#1F2226] bg-[#0B0B0C]/50">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <GitBranch className="w-3 h-3 text-[#6B7280]" />
                    <span className="text-[10px] text-[#6B7280]">Child Executions ({children.length})</span>
                  </div>
                  <div className="px-4 pb-3 space-y-2">
                    {children.map((child: any) => {
                      const childConfig = statusConfig[child.status] || statusConfig.queued
                      const ChildIcon = childConfig.icon
                      return (
                        <div key={child.id} className="flex items-center justify-between p-2 bg-[#111214] rounded border border-[#1F2226]">
                          <div className="flex items-center gap-2">
                            <ChildIcon className={`w-3 h-3 ${childConfig.color}`} />
                            <span className="text-xs text-white font-mono">{child.id.slice(0, 8)}</span>
                            <span className="text-xs text-[#9BA3AF]">{child.task?.title || 'Sub-task'}</span>
                          </div>
                          <span className={`text-[10px] ${childConfig.color}`}>{child.status}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string, value: number, color: 'green' | 'red' | 'blue' | 'neutral' }) {
  const colors = {
    green: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
    red: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
    blue: 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]',
    neutral: 'bg-[#111214] border-[#1F2226] text-white',
  }
  return (
    <div className={`px-3 py-2 rounded-lg border ${colors[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  )
}
