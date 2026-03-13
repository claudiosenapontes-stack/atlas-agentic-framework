'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface ExecutionThroughputPlaceholderProps {
  className?: string;
}

export function ExecutionThroughputPlaceholder({ className = '' }: ExecutionThroughputPlaceholderProps) {
  const [timeRange, setTimeRange] = useState('1h');

  // Simulated sparkline data
  const sparklineData = [40, 65, 45, 80, 55, 70, 60, 85, 50, 75, 65, 90];

  return (
    <div className={`bg-[#0B0B0C] rounded-[10px] border border-[#1F2226] ${className}`}>
      <div className="px-3 py-2 border-b border-[#1F2226] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-[#6B7280]" />
          <h2 className="text-xs font-medium text-[#9BA3AF]">Throughput</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2226] text-[#6B7280]">
            Gate 4
          </span>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[10px] bg-[#0B0B0C] border border-[#1F2226] rounded px-2 py-1 text-[#9BA3AF]"
        >
          <option value="1h">1h</option>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
        </select>
      </div>

      <div className="p-3">
        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
            <div className="flex items-center gap-1 text-[#6B7280] mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px]">/min</span>
            </div>
            <p className="text-base font-mono font-medium text-white">—</p>
          </div>
          
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
            <div className="flex items-center gap-1 text-[#6B7280] mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">ms</span>
            </div>
            <p className="text-base font-mono font-medium text-white">—</p>
          </div>
          
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-2">
            <div className="flex items-center gap-1 text-[#6B7280] mb-1">
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px]">%</span>
            </div>
            <p className="text-base font-mono font-medium text-white">—</p>
          </div>
        </div>

        {/* Sparkline chart placeholder */}
        <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-3">
          <p className="text-[10px] text-[#6B7280] mb-2">Execution Rate</p>
          <div className="flex items-end gap-0.5 h-12">
            {sparklineData.map((value, idx) => (
              <div
                key={idx}
                className="flex-1 bg-[#6B7280]/30 rounded-sm"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>

        {/* Preview notice */}
        <div className="mt-2 text-center">
          <p className="text-[10px] text-[#6B7280]">Gate 4 Preview — Live metrics pending</p>
        </div>
      </div>
    </div>
  );
}
