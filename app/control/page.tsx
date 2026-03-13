'use client';

import { CommandCenter } from '@/app/components/command-center';
import { LiveEventStream } from '@/app/components/live-event-stream';
import { ExecutionPanel } from '@/app/components/execution-panel';
import { HealthSummary } from '@/app/components/health-summary';
import { GateStatusMars } from '@/app/components/gate-status-mars';
import { ClaimExecutionStrip } from '@/app/components/claim-execution-strip';
import { ExecutionThroughputPlaceholder } from '@/app/components/execution-throughput-placeholder';
import { Zap, Radio, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ControlPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* TOP BAR — Mission Control Header */}
      <header className="border-b border-[#1F2226] bg-[#0B0B0C]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title + Gate Status */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF6A00] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-medium text-white">ATLAS CONTROL</h1>
                  <p className="text-[10px] text-[#6B7280] font-mono">MISSION CONTROL</p>
                </div>
              </div>
              
              <GateStatusMars 
                gate1="operational"
                gate2="operational" 
                gate3="operational"
                gate4="in_progress"
                gate5a="pending"
              />
            </div>

            {/* Center: Live Indicator */}
            <div className="hidden xl:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111214] border border-[#1F2226]">
                <Radio className="w-3.5 h-3.5 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#6B7280]">SYSTEM</span>
                <span className="text-xs text-[#16C784]">OPERATIONAL</span>
              </div>
              <ClaimExecutionStrip refreshInterval={3000} />
            </div>

            {/* Right: Status */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] animate-pulse" />
              <span className="text-xs text-[#6B7280]">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-4">
        <div className="grid grid-cols-12 gap-3">
          
          {/* LEFT COLUMN — Command & System Status */}
          <div className="col-span-12 xl:col-span-3 space-y-3">
            {/* Command Center */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C]">
                <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider">Command</h2>
              </div>
              <div className="p-3">
                <CommandCenter />
              </div>
            </section>

            {/* System Health */}
            <HealthSummary refreshInterval={10000} />

            {/* Quick Status */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3">System Status</h2>
              <div className="space-y-2">
                <StatusItem label="Ingest Pipeline" status="operational" />
                <StatusItem label="Task Queue" status="operational" />
                <StatusItem label="Execution Engine" status="operational" />
                <StatusItem label="Event Stream" status="operational" />
                <StatusItem label="Delegation Service" status="operational" />
              </div>
            </section>
          </div>

          {/* CENTER COLUMN — Live Operations */}
          <div className="col-span-12 xl:col-span-6 space-y-3">
            {/* Executions */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C] flex items-center justify-between">
                <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Live Executions
                </h2>
                <span className="text-[10px] text-[#6B7280] font-mono">REAL-TIME</span>
              </div>
              <div className="p-3">
                <ExecutionPanel maxItems={12} refreshInterval={3000} />
              </div>
            </section>

            {/* Event Log */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C] flex items-center justify-between">
                <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] animate-pulse" />
                  Event Stream
                </h2>
                <span className="text-[10px] text-[#6B7280] font-mono">SSE</span>
              </div>
              <div className="p-3">
                <LiveEventStream maxEvents={30} />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN — Metrics & Preview */}
          <div className="col-span-12 xl:col-span-3 space-y-3">
            {/* Live Metrics */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3">Live Metrics</h2>
              <div className="grid grid-cols-2 gap-2">
                <MetricBox label="Tasks/min" value="—" />
                <MetricBox label="Latency" value="—" />
                <MetricBox label="Success" value="—" />
                <MetricBox label="Queue" value="—" />
              </div>
            </section>

            {/* Orchestration Preview — Gate 4 PARTIAL */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1F2226] bg-[#0B0B0C] flex items-center justify-between">
                <h2 className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Orchestration</h2>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020] animate-pulse" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30">PARTIAL</span>
                </div>
              </div>
              <div className="p-3">
                {/* Gate 4 Closeout Blocker */}
                <div className="mb-3 p-2.5 rounded-lg bg-[#FFB020]/5 border border-[#FFB020]/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#FFB020] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-[#FFB020] uppercase tracking-wide">Closeout Validation</p>
                      <p className="text-xs text-[#9BA3AF] mt-0.5">Gate 4 execution loop under closeout validation. Awaiting Henry verification.</p>
                    </div>
                  </div>
                </div>
                <ExecutionThroughputPlaceholder className="bg-[#0B0B0C] border-[#1F2226]" />
              </div>
            </section>

            {/* Alerts */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Active Alerts
              </h2>
              <div className="text-center py-4">
                <CheckCircle2 className="w-5 h-5 text-[#16C784] mx-auto mb-1" />
                <p className="text-xs text-[#6B7280]">No active alerts</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: 'operational' | 'degraded' | 'down' }) {
  const colors = {
    operational: 'bg-[#16C784]',
    degraded: 'bg-[#FFB020]',
    down: 'bg-[#FF3B30]'
  }
  
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1F2226] last:border-0">
      <span className="text-xs text-[#9BA3AF]">{label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0B0B0C] rounded-lg p-2 border border-[#1F2226]">
      <p className="text-[10px] text-[#6B7280] uppercase">{label}</p>
      <p className="text-base font-mono font-medium text-white">{value}</p>
    </div>
  )
}
