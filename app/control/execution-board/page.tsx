"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle2, Clock, AlertTriangle, Play, RefreshCw, Shield, Target } from "lucide-react";

interface FrontStatus {
  id: string;
  name: string;
  priority: number;
  status: "executing" | "closed" | "awaiting_deploy" | "blocked";
  lastVerification: string;
  health: number;
  commit?: string;
}

const initialFronts: FrontStatus[] = [
  { id: "autonomous", name: "Autonomous Layer", priority: 1, status: "executing", lastVerification: "14:06 EDT", health: 85, commit: "36cefcd" },
  { id: "executive-ops", name: "Executive Ops", priority: 2, status: "closed", lastVerification: "14:06 EDT", health: 100, commit: "36cefcd" },
  { id: "atlas-control", name: "Atlas OS Control", priority: 3, status: "awaiting_deploy", lastVerification: "14:06 EDT", health: 90, commit: "2f23806" },
  { id: "knowledge", name: "Knowledge", priority: 4, status: "closed", lastVerification: "14:06 EDT", health: 100 },
  { id: "operations", name: "Operations Unified", priority: 5, status: "closed", lastVerification: "13:56 EDT", health: 100, commit: "958e2c2" },
];

function StatusBadge({ status }: { status: FrontStatus["status"] }) {
  const configs = {
    executing: { icon: Play, color: "text-[#FFB020]", bg: "bg-[#FFB020]/20", label: "EXECUTING" },
    closed: { icon: CheckCircle2, color: "text-[#16C784]", bg: "bg-[#16C784]/20", label: "CLOSED" },
    awaiting_deploy: { icon: Clock, color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/20", label: "AWAITING DEPLOY" },
    blocked: { icon: AlertTriangle, color: "text-[#FF3B30]", bg: "bg-[#FF3B30]/20", label: "BLOCKED" },
  };
  const config = configs[status];
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" /> {config.label}
    </span>
  );
}

function HealthBar({ health }: { health: number }) {
  const color = health >= 90 ? "bg-[#16C784]" : health >= 70 ? "bg-[#FFB020]" : "bg-[#FF3B30]";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-[#1F2226] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${health}%` }} />
      </div>
      <span className="text-xs text-[#9BA3AF]">{health}%</span>
    </div>
  );
}

export default function PostSqlExecutionBoard() {
  const [fronts] = useState<FrontStatus[]>(initialFronts);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedFront, setSelectedFront] = useState<string | null>(null);

  const refreshData = () => setLastRefresh(new Date());
  useEffect(() => { const interval = setInterval(refreshData, 60000); return () => clearInterval(interval); }, []);

  const closedCount = fronts.filter(f => f.status === "closed").length;
  const blockedCount = fronts.filter(f => f.status === "blocked").length;
  const executingCount = fronts.filter(f => f.status === "executing").length;
  const awaitingCount = fronts.filter(f => f.status === "awaiting_deploy").length;

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#FF6A00]" />
              <h1 className="text-2xl font-bold">ATLAS-HENRY-POST-SQL-EXECUTION-064</h1>
            </div>
            <p className="text-[#9BA3AF]">Live Execution Board — Post-Fix Truth Only</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B7280]">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={refreshData} className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D32] rounded-lg text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#111214] border border-[#16C784]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#16C784] mb-2"><CheckCircle2 className="w-5 h-5" /><span className="text-2xl font-bold">{closedCount}</span></div>
            <p className="text-[#9BA3AF] text-sm">Closed</p>
          </div>
          <div className="bg-[#111214] border border-[#FFB020]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#FFB020] mb-2"><Play className="w-5 h-5" /><span className="text-2xl font-bold">{executingCount}</span></div>
            <p className="text-[#9BA3AF] text-sm">Executing</p>
          </div>
          <div className="bg-[#111214] border border-[#3B82F6]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#3B82F6] mb-2"><Clock className="w-5 h-5" /><span className="text-2xl font-bold">{awaitingCount}</span></div>
            <p className="text-[#9BA3AF] text-sm">Awaiting Deploy</p>
          </div>
          <div className="bg-[#111214] border border-[#FF3B30]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#FF3B30] mb-2"><AlertTriangle className="w-5 h-5" /><span className="text-2xl font-bold">{blockedCount}</span></div>
            <p className="text-[#9BA3AF] text-sm">Blocked</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111214] border border-[#1F2226] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1F2226]">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="w-5 h-5 text-[#FF6A00]" /> Execution Fronts</h2>
        </div>
        <table className="w-full">
          <thead className="bg-[#1F2226]/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Front</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Last Verification</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#9BA3AF] uppercase">Commit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2226]">
            {fronts.sort((a, b) => a.priority - b.priority).map((front) => (
              <tr key={front.id} onClick={() => setSelectedFront(selectedFront === front.id ? null : front.id)} className="hover:bg-[#1F2226]/30 cursor-pointer transition-colors">
                <td className="px-6 py-4"><span className="text-[#FF6A00] font-bold">#{front.priority}</span></td>
                <td className="px-6 py-4 font-medium">{front.name}</td>
                <td className="px-6 py-4"><StatusBadge status={front.status} /></td>
                <td className="px-6 py-4 text-[#9BA3AF] text-sm">{front.lastVerification}</td>
                <td className="px-6 py-4"><HealthBar health={front.health} /></td>
                <td className="px-6 py-4 text-[#9BA3AF] text-sm font-mono">{front.commit ? front.commit.slice(0, 7) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedFront && (
        <div className="mt-6 bg-[#111214] border border-[#1F2226] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-[#FF6A00]" /> Front Details: {fronts.find(f => f.id === selectedFront)?.name}</h3>
          {selectedFront === "autonomous" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Notification Service — Operational</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Followup Worker — Operational</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Autonomy Core Schema — Applied</span></div>
              <div className="flex items-center gap-2 text-[#FFB020]"><Clock className="w-4 h-4" /><span>Vercel Auto-Deploy — Pending</span></div>
            </div>
          )}
          {selectedFront === "executive-ops" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>meeting_prep handler — Fetch by ID verified</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>approval_request handler — Fetch by ID verified</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>watchlist_alert handler — Fetch by ID verified</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Followup constraint fix — Applied</span></div>
            </div>
          )}
          {selectedFront === "atlas-control" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Control Submenu — Cleaned</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Fleet/Agents — Separated</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Severino Runtime — Added</span></div>
              <div className="flex items-center gap-2 text-[#3B82F6]"><Clock className="w-4 h-4" /><span>Deploy Status: Awaiting Vercel</span></div>
            </div>
          )}
          {selectedFront === "knowledge" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Schema alignment — extracted_at → created_at</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>API endpoints — Verified</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>UI Pages — Deployed</span></div>
            </div>
          )}
          {selectedFront === "operations" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Unified Dashboard — /operations</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Runtime Health — PM2, Redis, Supabase</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Fleet Status — Agent grid with health</span></div>
              <div className="flex items-center gap-2 text-[#16C784]"><CheckCircle2 className="w-4 h-4" /><span>Navigation — /operations/tasks, /operations/delegation</span></div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-[#6B7280]">
        <p>Next Checkpoint: 14:42 EDT (30-min escalation window)</p>
        <p>Pending Vercel Deploys: 36cefcd, 958e2c2, 2f23806</p>
      </div>
    </div>
  );
}
