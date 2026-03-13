'use client';

import { History, Clock, CheckCircle2, XCircle } from 'lucide-react';

/**
 * AttemptHistory — Gate 5A Durable Execution Component
 * 
 * Displays execution attempt history and outcomes.
 * Placeholder until Optimus delivers live API.
 */
export function AttemptHistory() {
  return (
    <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#9BA3AF]" />
          <span className="text-xs font-medium text-[#9BA3AF]">Attempt History</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020]">G5A</span>
      </div>
      
      {/* Placeholder History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded bg-[#0B0B0C] border border-[#1F2226]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B7280]">Attempt #1</span>
          </div>
          <span className="text-[10px] text-[#6B7280]">—</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-[#0B0B0C] border border-[#1F2226]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B7280]">Attempt #2</span>
          </div>
          <span className="text-[10px] text-[#6B7280]">—</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-[#1F2226]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
          <span className="text-[10px] text-[#6B7280]">Waiting for API connection</span>
        </div>
      </div>
    </div>
  );
}
