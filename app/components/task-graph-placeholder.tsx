'use client';

import { GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';

interface TaskGraphPlaceholderProps {
  className?: string;
}

export function TaskGraphPlaceholder({ className = '' }: TaskGraphPlaceholderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-[#0B0B0C] rounded-[10px] border border-[#1F2226] ${className}`}>
      <div className="px-3 py-2 border-b border-[#1F2226] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[#6B7280]" />
          <h2 className="text-xs font-medium text-[#9BA3AF]">Task Graph</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2226] text-[#6B7280]">
            Gate 4
          </span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-[#1F2226] text-[#6B7280] transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>

      <div className={`p-3 ${isExpanded ? 'h-48' : 'h-24'} transition-all duration-300`}>
        <div className="relative w-full h-full bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, #6B7280 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />
          
          {/* Simulated nodes */}
          <div className="absolute top-1/4 left-1/4 w-8 h-8 rounded-lg bg-[#1F2226] border border-[#6B7280]/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#16C784]" />
          </div>
          
          <div className="absolute top-1/2 left-1/2 w-8 h-8 rounded-lg bg-[#1F2226] border border-[#6B7280]/30 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 rounded-full bg-[#6B7280] animate-pulse" />
          </div>
          
          <div className="absolute bottom-1/4 right-1/4 w-8 h-8 rounded-lg bg-[#1F2226] border border-[#6B7280]/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#6B7280]" />
          </div>
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
            <line x1="30%" y1="30%" x2="50%" y2="50%" stroke="#6B7280" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="#6B7280" strokeWidth="1" strokeDasharray="4,4" />
          </svg>
          
          {/* Preview overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B0B0C]/60 backdrop-blur-sm">
            <p className="text-[10px] text-[#6B7280]">Task Graph Preview</p>
          </div>
        </div>
      </div>
    </div>
  );
}
