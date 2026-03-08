import { getApprovals } from '@/app/actions/approvals'
import { ApprovalList } from '@/components/approval-list'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const approvals = await getApprovals()
  const pendingCount = approvals.filter((a: any) => a.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-gray-400">Review and manage approval requests</p>
        </div>
        <div className="bg-amber-900/50 border border-amber-700 px-4 py-2 rounded-lg">
          <span className="text-amber-400 font-medium">{pendingCount} Pending</span>
        </div>
      </div>

      <ApprovalList approvals={approvals} />
    </div>
  )
}
