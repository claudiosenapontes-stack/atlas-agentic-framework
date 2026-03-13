'use client';

import { UserCheck, ArrowUpRight } from 'lucide-react';

interface DelegatedToAgentLabelProps {
  agentId: string | null;
  delegatedBy?: string | null;
  delegatedAt?: string | null;
  compact?: boolean;
}

export function DelegatedToAgentLabel({ 
  agentId, 
  delegatedBy, 
  delegatedAt,
  compact = false 
}: DelegatedToAgentLabelProps) {
  if (!agentId && !delegatedBy) return null;

  const isSelfAssigned = agentId === delegatedBy;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
        <UserCheck className="w-3 h-3" />
        <span>{agentId || 'Unassigned'}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-blue-900">
            {agentId || 'Unassigned'}
          </span>
          {delegatedBy && !isSelfAssigned && (
            <span className="text-xs text-blue-600">
              delegated by {delegatedBy}
            </span>
          )}
        </div>
      </div>
      {delegatedAt && (
        <span className="text-xs text-slate-400">
          {new Date(delegatedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
