'use client';

import { useState } from 'react';
import { Network, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface DelegationChainPlaceholderProps {
  className?: string;
}

export function DelegationChainPlaceholder({ className = '' }: DelegationChainPlaceholderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-[#0B0B0C] rounded-[10px] border border-[#1F2226] ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#111214] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-[#6B7280]" />
          <h2 className="text-xs font-medium text-[#9BA3AF]">Delegation Chain</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2226] text-[#6B7280]">
            Gate 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B7280]">Tree view</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1F2226] p-3">
          <div className="space-y-2">
            {/* Root node */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#1F2226] border border-[#6B7280]/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#9BA3AF]">Parent Task</p>
              </div>
            </div>

            {/* Branch */}
            <div className="ml-3 pl-3 border-l border-[#1F2226] space-y-2">
              <div className="flex items-center gap-2 relative">
                <div className="absolute -left-[14px] top-1/2 w-3 h-px bg-[#1F2226]" />
                <div className="w-6 h-6 rounded-lg bg-[#1F2226] border border-[#6B7280]/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
                </div>
                <span className="text-xs text-[#9BA3AF]">Child Task</span>
              </div>
            </div>
          </div>

          <p className="mt-3 pt-2 border-t border-[#1F2226] text-[10px] text-[#6B7280] text-center">
            Full tree navigation — Gate 4 Preview
          </p>
        </div>
      )}
    </div>
  );
}
