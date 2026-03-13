'use client';

import { Clock, Activity, Filter } from 'lucide-react';
import { useState } from 'react';

interface AgentActivityPlaceholderProps {
  className?: string;
}

export function AgentActivityPlaceholder({ className = '' }: AgentActivityPlaceholderProps) {
  const [filter, setFilter] = useState('all');

  const activities = [
    { agent: 'system', action: 'Task processed', time: '2m ago' },
    { agent: 'system', action: 'Execution completed', time: '5m ago' },
    { agent: 'system', action: 'Health check', time: '12m ago' },
  ];

  return (
    <div className={`bg-[#0B0B0C] rounded-[10px] border border-[#1F2226] ${className}`}>
      <div className="px-3 py-2 border-b border-[#1F2226] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#6B7280]" />
          <h2 className="text-xs font-medium text-[#9BA3AF]">Activity</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2226] text-[#6B7280]">
            Gate 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-[#6B7280]" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[10px] bg-[#0B0B0C] border border-[#1F2226] rounded px-2 py-1 text-[#9BA3AF]"
          >
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="p-3">
        <div className="space-y-2">
          {activities.map((activity, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#111214] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#1F2226] flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3 text-[#6B7280]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#6B7280]">{activity.agent}</p>
                <p className="text-xs text-[#9BA3AF] truncate">{activity.action}</p>
              </div>
              <span className="text-[10px] text-[#6B7280] shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-[#1F2226] text-center">
          <p className="text-[10px] text-[#6B7280]">Live feed — Gate 4 Preview</p>
        </div>
      </div>
    </div>
  );
}
