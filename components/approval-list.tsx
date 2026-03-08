'use client'

import { useState } from 'react'
import { respondToApproval } from '@/app/actions/approvals'
import { formatDistanceToNow } from 'date-fns'

interface ApprovalListProps {
  approvals: any[]
}

export function ApprovalList({ approvals }: ApprovalListProps) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? approvals : approvals.filter((a: any) => a.status === filter)

  const handleApprove = async (id: string) => {
    await respondToApproval(id, 'approved', 'Approved via Mission Control')
    window.location.reload()
  }

  const handleReject = async (id: string) => {
    await respondToApproval(id, 'rejected', 'Rejected via Mission Control')
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {status} ({approvals.filter((a: any) => status === 'all' || a.status === status).length})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No approvals found</div>
        ) : (
          filtered.map((approval: any) => (
            <div key={approval.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      approval.status === 'pending' ? 'bg-amber-900/50 text-amber-400' :
                      approval.status === 'approved' ? 'bg-green-900/50 text-green-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {approval.status}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                      {approval.action_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-white">{approval.task?.title || 'Unknown Task'}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Requested {formatDistanceToNow(new Date(approval.created_at))} ago
                  </p>
                </div>

                {approval.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
