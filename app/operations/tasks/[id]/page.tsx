import { getTaskById, getExecutionsByTaskId, getTaskChildren } from '@/app/actions/tasks'
import { getAgents } from '@/app/actions/agents'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { TaskActionButtons } from '@/app/components/task-action-buttons'
import { HotLeadCard } from '@/app/components/hot-lead-card'
import { ActionAuditTrail } from '@/app/components/action-audit-trail'
import { DeliveryStatusBadge } from '@/app/components/delivery-status-badge'
import { Calendar, Clock, GitBranch, CheckCircle2, AlertCircle, PauseCircle, ArrowUpRight, ArrowDownRight, Layers, Zap, Lock, MessageSquare, Play, XCircle } from 'lucide-react'

interface TaskDetailPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const [task, executions, agents, children] = await Promise.all([
    getTaskById(params.id),
    getExecutionsByTaskId(params.id),
    getAgents(),
    getTaskChildren(params.id).catch(() => [])
  ])

  if (!task) {
    notFound()
  }

  const statusColors: Record<string, string> = {
    inbox: 'bg-[#6B7280]',
    in_progress: 'bg-[#FFB020]',
    completed: 'bg-[#16C784]',
    blocked: 'bg-[#FF3B30]',
    claimed: 'bg-[#3B82F6]',
    deferred: 'bg-[#9BA3AF]',
    delegated: 'bg-[#8B5CF6]',
    escalated: 'bg-[#FF3B30]',
  }

  const statusIcons: Record<string, any> = {
    inbox: Clock,
    in_progress: Play,
    completed: CheckCircle2,
    blocked: XCircle,
    claimed: Lock,
    deferred: PauseCircle,
    delegated: GitBranch,
    escalated: AlertCircle,
  }

  const leadData = task.payload?.lead || task.lead_data
  const isHotLeadTask = leadData && (task.type === 'hot_lead' || task.priority === 'high' || task.priority === 'urgent')

  const currentExecution = executions.find((e: any) => e.status === 'running' || e.status === 'in_progress')
  const currentExecutor = currentExecution?.agent || task.assigned_agent

  const slaMinutes = task.sla_minutes || 30
  const dueAt = task.due_at ? new Date(task.due_at) : new Date(new Date(task.created_at).getTime() + slaMinutes * 60000)
  const isOverdue = new Date() > dueAt && task.status !== 'completed'
  const timeRemaining = dueAt.getTime() - Date.now()
  const minutesRemaining = Math.floor(timeRemaining / 60000)

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <div className="mb-6">
        <Link href="/operations/tasks" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> Back to Tasks
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-white ${statusColors[task.status] || 'bg-[#6B7280]'}`}>
                {(() => { const Icon = statusIcons[task.status] || Clock; return <Icon className="w-3 h-3" /> })()}
                {task.status}
              </span>
              {task.company && (
                <span className="flex items-center gap-1 text-[#9BA3AF]">
                  <Layers className="w-3 h-3" />{task.company.name}
                </span>
              )}
              {task.source_workflow && (
                <span className="flex items-center gap-1 text-[#9BA3AF]">
                  <Zap className="w-3 h-3" />{task.source_workflow}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                task.priority === 'urgent' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' :
                task.priority === 'high' ? 'bg-[#FFB020]/20 text-[#FFB020]' :
                'bg-[#6B7280]/20 text-[#6B7280]'
              }`}>{task.priority}</span>
            </div>
          </div>

          <div className={`flex-shrink-0 px-3 py-2 rounded-lg border ${
            isOverdue ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30' : minutesRemaining < 10 ? 'bg-[#FFB020]/10 border-[#FFB020]/30' : 'bg-[#16C784]/10 border-[#16C784]/30'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isOverdue ? 'text-[#FF3B30]' : minutesRemaining < 10 ? 'text-[#FFB020]' : 'text-[#16C784]'}`} />
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">SLA</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-[#FF3B30]' : minutesRemaining < 10 ? 'text-[#FFB020]' : 'text-[#16C784]'}`}>
                  {isOverdue ? `Overdue ${Math.abs(minutesRemaining)}m` : `${minutesRemaining}m remaining`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Created {format(new Date(task.created_at), 'MMM d, HH:mm')} by {task.created_by?.display_name || task.created_by?.name || 'System'}
          </span>
          <span>•</span>
          <span>Due {format(dueAt, 'MMM d, HH:mm')}</span>
          {task.parent_task_id && (
            <>
              <span>•</span>
              <Link href={`/operations/tasks/${task.parent_task_id}`} className="flex items-center gap-1 text-[#9BA3AF] hover:text-white">
                <ArrowUpRight className="w-3 h-3" />Parent Task
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isHotLeadTask && leadData && (
            <HotLeadCard
              lead={{
                id: leadData.id || task.id,
                name: leadData.name || 'Unknown Lead',
                email: leadData.email || 'N/A',
                company: leadData.company || task.company?.name || 'Unknown',
                score: leadData.score || 0,
                source: leadData.source || 'unknown',
                estimated_value: leadData.estimated_value,
              }}
              task={{ id: task.id, sla_minutes: slaMinutes, due_at: dueAt.toISOString() }}
              priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'}
              recipientId={task.assigned_agent_id || 'claudio'}
            />
          )}

          <section className="bg-[#111214] rounded-lg border border-[#1F2226] p-4">
            <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#9BA3AF]" />Description
            </h2>
            <p className="text-sm text-[#9BA3AF]">{task.description || 'No description provided.'}</p>
          </section>

          <section className="bg-[#111214] rounded-lg border border-[#1F2226] p-4">
            <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#9BA3AF]" />Execution Mapping
            </h2>
            <div className="mb-4 p-3 bg-[#0B0B0C] rounded-lg border border-[#1F2226]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase">Current Executor</p>
                  <p className="text-sm text-white">{currentExecutor?.display_name || currentExecutor?.name || 'Unassigned'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#6B7280] uppercase">Status</p>
                  <p className={`text-sm ${currentExecution ? 'text-[#FFB020]' : executions.length > 0 ? 'text-[#9BA3AF]' : 'text-[#6B7280]'}`}>
                    {currentExecution ? `Running (${currentExecution.status})` : executions.length > 0 ? 'Completed' : 'Not started'}
                  </p>
                </div>
              </div>
            </div>

            {executions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#6B7280] uppercase">Related Executions ({executions.length})</p>
                <div className="space-y-2">
                  {executions.slice(0, 5).map((execution: any) => (
                    <div key={execution.id} className="flex items-center justify-between p-2 bg-[#0B0B0C] rounded border border-[#1F2226]">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          execution.status === 'succeeded' ? 'bg-[#16C784]' : execution.status === 'failed' ? 'bg-[#FF3B30]' : execution.status === 'running' ? 'bg-[#FFB020] animate-pulse' : 'bg-[#6B7280]'
                        }`} />
                        <span className="text-xs text-white font-mono">{execution.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#9BA3AF]">{execution.agent?.display_name || execution.agent?.name || 'Unknown'}</span>
                        <span className={`text-xs ${
                          execution.status === 'succeeded' ? 'text-[#16C784]' : execution.status === 'failed' ? 'text-[#FF3B30]' : execution.status === 'running' ? 'text-[#FFB020]' : 'text-[#6B7280]'
                        }`}>{execution.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {(task.parent_task_id || children.length > 0) && (
            <section className="bg-[#111214] rounded-lg border border-[#1F2226] p-4">
              <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#9BA3AF]" />Task Hierarchy
              </h2>
              {task.parent_task_id && (
                <div className="mb-3">
                  <p className="text-[10px] text-[#6B7280] uppercase mb-2">Parent Task</p>
                  <Link href={`/tasks/${task.parent_task_id}`} className="flex items-center gap-2 p-2 bg-[#0B0B0C] rounded border border-[#1F2226] hover:border-[#3B82F6]/50">
                    <ArrowUpRight className="w-3 h-3 text-[#6B7280]" />
                    <span className="text-xs text-[#9BA3AF]">{task.parent_task?.title || 'View Parent Task'}</span>
                  </Link>
                </div>
              )}
              {children.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase mb-2">Child Tasks ({children.length})</p>
                  <div className="space-y-2">
                    {children.map((child: any) => (
                      <Link key={child.id} href={`/operations/tasks/${child.id}`} className="flex items-center justify-between p-2 bg-[#0B0B0C] rounded border border-[#1F2226] hover:border-[#3B82F6]/50">
                        <div className="flex items-center gap-2">
                          <ArrowDownRight className="w-3 h-3 text-[#6B7280]" />
                          <span className="text-xs text-white">{child.title}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          child.status === 'completed' ? 'bg-[#16C784]/20 text-[#16C784]' : child.status === 'in_progress' ? 'bg-[#FFB020]/20 text-[#FFB020]' : child.status === 'blocked' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-[#6B7280]/20 text-[#6B7280]'
                        }`}>{child.status}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="bg-[#111214] rounded-lg border border-[#1F2226] p-4">
            <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#9BA3AF]" />Dependencies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-[#0B0B0C] rounded-lg border border-[#1F2226]">
                <p className="text-[10px] text-[#6B7280] uppercase mb-2">Blocked By</p>
                {task.blocked_by?.length > 0 ? (
                  <div className="space-y-1">
                    {task.blocked_by.map((blocker: any) => (
                      <Link key={blocker.id} href={`/operations/tasks/${blocker.id}`} className="text-xs text-[#FF3B30] hover:text-[#FF6A6A] block">{blocker.title}</Link>
                    ))}
                  </div>
                ) : <p className="text-xs text-[#6B7280]">No blockers</p>}
              </div>
              <div className="p-3 bg-[#0B0B0C] rounded-lg border border-[#1F2226]">
                <p className="text-[10px] text-[#6B7280] uppercase mb-2">Waiting On</p>
                {task.waiting_on?.length > 0 ? (
                  <div className="space-y-1">
                    {task.waiting_on.map((wait: any) => (
                      <Link key={wait.id} href={`/operations/tasks/${wait.id}`} className="text-xs text-[#FFB020] hover:text-[#FFCA4D] block">{wait.title}</Link>
                    ))}
                  </div>
                ) : <p className="text-xs text-[#6B7280]">Not waiting</p>}
              </div>
              <div className="p-3 bg-[#0B0B0C]
              rounded-lg border border-[#1F2226]">
                <p className="text-[10px] text-[#6B7280] uppercase mb-2">Next Action</p>
                <p className="text-xs text-white">{task.next_action || "Review and assign"}</p>
              </div>
            </div>
          </section>

          <ActionAuditTrail taskId={task.id} refreshInterval={5000} />
        </div>

        <div className="space-y-6">
          <div className="bg-[#111214] rounded-lg p-4 border border-[#1F2226]">
            <h2 className="text-sm font-medium text-white mb-4">Actions</h2>
            <TaskActionButtons
              taskId={task.id}
              taskStatus={task.status}
              assignedAgentId={task.assigned_agent_id}
              currentAgentId="claudio"
              currentAgentName="Claudio"
            />
          </div>

          <div className="bg-[#111214] rounded-lg p-4 border border-[#1F2226]">
            <h2 className="text-sm font-medium text-white mb-4">Ownership</h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Owner</p>
                <p className="text-sm text-white">{task.owner?.display_name || task.owner?.name || task.assigned_agent?.display_name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Created By</p>
                <p className="text-sm text-white">{task.created_by?.display_name || task.created_by?.name || "System"}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Assigned To</p>
                <p className="text-sm text-white">{task.assigned_agent?.display_name || "Unassigned"}</p>
              </div>
              {task.executive_owner && (
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase">Executive Owner</p>
                  <p className="text-sm text-white">{task.executive_owner.display_name}</p>
                </div>
              )}
            </div>
          </div>

          {task.notification_id && (
            <div className="bg-[#111214] rounded-lg p-4 border border-[#1F2226]">
              <h2 className="text-sm font-medium text-white mb-4">Notification</h2>
              <DeliveryStatusBadge
                channels={task.notification_channels || ["in_app"]}
                status={task.notification_status || "pending"}
                channelStatus={task.channel_status}
              />
            </div>
          )}

          {task.approval_required && (
            <div className="bg-[#111214] rounded-lg p-4 border border-[#1F2226]">
              <h2 className="text-sm font-medium text-white mb-4">Approval</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                task.approval_status === "approved" ? "bg-[#16C784]/20 text-[#16C784]" :
                task.approval_status === "rejected" ? "bg-[#FF3B30]/20 text-[#FF3B30]" :
                "bg-[#FFB020]/20 text-[#FFB020]"
              }`}>{task.approval_status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
