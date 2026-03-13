'use client';

import { CommandCenter } from '@/app/components/command-center';
import { LiveEventStream } from '@/app/components/live-event-stream';
import { ExecutionPanel } from '@/app/components/execution-panel';
import { HealthSummary } from '@/app/components/health-summary';
import { GateStatusMars } from '@/app/components/gate-status-mars';
import { ClaimExecutionStrip } from '@/app/components/claim-execution-strip';
import { ExecutionThroughputPlaceholder } from '@/app/components/execution-throughput-placeholder';
import { LeaseMonitor } from '@/app/components/lease-monitor';
import { HeartbeatHealth } from '@/app/components/heartbeat-health';
import { RetryQueue } from '@/app/components/retry-queue';
import { ExecutionLineage } from '@/app/components/execution-lineage';
import { AttemptHistory } from '@/app/components/attempt-history';
import { Zap, Radio, Activity, AlertCircle, CheckCircle2, Layers, GitBranch, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ControlPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* TOP BAR — Mission Control Header */}
      <header className="border-b border-[#1F2226] bg-[#0B0B0C]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title + Layer Badge + Gate Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF6A00] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-medium text-white">ATLAS CONTROL</h1>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30 uppercase tracking-wider">Operations</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] font-mono">MISSION CONTROL — LIVE OPERATIONS</p>
                </div>
              </div>
              
              <div className="hidden md:block">
                <GateStatusMars 
                  gate1="operational"
                  gate2="operational" 
                  gate3="operational"
                  gate4="operational"
                  gate5a="operational"
                />
              </div>
            </div>

            {/* Center: Live Indicator + Nav */}
            <div className="hidden xl:flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111214] border border-[#1F2226]">
                <Link href="/" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">System</Link>
                <span className="text-[#1F2226]">/</span>
                <span className="px-2 py-1 rounded text-[10px] text-white bg-[#1F2226]">Control</span>
                <span className="text-[#1F2226]">/</span>
                <Link href="/tasks" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Tasks</Link>
                <span className="text-[#1F2226]">/</span>
                <Link href="/cost" className="px-2 py-1 rounded text-[10px] text-[#6B7280] hover:text-white hover:bg-[#1F2226] transition-colors">Cost</Link>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111214] border border-[#1F2226]">
                <Radio className="w-3.5 h-3.5 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#6B7280]">SYSTEM</span>
                <span className="text-xs text-[#16C784]">OPERATIONAL</span>
              </div>
              <ClaimExecutionStrip refreshInterval={3000} />
            </div>

            {/* Right: Status + Environment */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded bg-[#16C784]/10 border border-[#16C784]/30">
                <GitBranch className="w-3 h-3 text-[#16C784]" />
                <span className="text-[10px] text-[#16C784]">production</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] animate-pulse" />
                <span className="text-xs text-[#6B7280]">LIVE</span>
              </div>
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

            {/* Gate 5A Durable Execution Preview */}
            <section className="bg-[#111214] rounded-[10px] border border-[#FFB020]/30 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#FFB020]/20 bg-[#FFB020]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#FFB020]" />
                  <h2 className="text-xs font-medium text-[#FFB020] uppercase tracking-wider">Durable Execution</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020] animate-pulse" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB020] text-[#0B0B0C] font-semibold">G5A ACTIVE</span>
                </div>
              </div>
              <div className="p-3">
                {/* G5A Feature Preview */}
                <div className="mb-3 p-3 rounded-lg bg-[#FFB020]/10 border border-[#FFB020]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FFB020]/20 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-[#FFB020]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-[#FFB020] uppercase tracking-wide">Gate 5A Operator Surface</p>
                      <p className="text-xs text-[#9BA3AF] mt-1">Durable execution monitoring. Lease management, heartbeat health, and retry queue active.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-[#6B7280]">Status:</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB020]/20 text-[#FFB020]">In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ExecutionThroughputPlaceholder className="bg-[#0B0B0C] border-[#1F2226]" />
              </div>
            </section>

            {/* Deployment Truth Panel */}
            <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
              <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5" />
                Deployment
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B0B0C] border border-[#1F2226]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16C784]" />
                    <span className="text-xs text-[#9BA3AF]">Staging</span>
                  </div>
                  <span className="text-[10px] text-[#16C784]">Live</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B0B0C] border border-[#1F2226]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16C784]" />
                    <span className="text-xs text-[#9BA3AF]">Production</span>
                  </div>
                  <span className="text-[10px] text-[#16C784]">Live</span>
                </div>
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

            {/* Gate 5A Durable Execution Components */}
            <section className="bg-[#111214] rounded-[10px] border border-[#FFB020]/30 p-3">
              <h2 className="text-xs font-medium text-[#FFB020] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                G5A Durable Execution
              </h2>
              <div className="space-y-3">
                <LeaseMonitor />
                <HeartbeatHealth />
                <RetryQueue />
                <ExecutionLineage />
                <AttemptHistory />
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
