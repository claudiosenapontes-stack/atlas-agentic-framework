'use client';

import { Heart, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * HeartbeatHealth — Gate 5A Durable Execution Component
 * 
 * Monitors agent heartbeat health and missed beats.
 * Placeholder until Optimus delivers live API.
 */
export function HeartbeatHealth() {
  return (
    <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-[#FF6A00]" />
          <span className="text-xs font-medium text-[#9BA3AF]">Heartbeat Health</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020]">G5A</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">Healthy Agents</span>
          <span className="text-white font-mono">—</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">Missed Beats</span>
          <span className="text-white font-mono">—</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">Last Check</span>
          <span className="text-white font-mono">—</span>
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
