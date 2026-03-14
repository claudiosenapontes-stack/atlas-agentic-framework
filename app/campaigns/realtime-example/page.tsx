"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Users, DollarSign, Target, Calendar, CheckCircle, Megaphone, Upload, Loader2 } from "lucide-react";
import { useCampaignsRealtime, useConnectionStatus } from "@/hooks/useRealtime";
import { ConnectionStatus } from "@/components/realtime/ConnectionStatus";

const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtN = (v: number) => new Intl.NumberFormat("en-US").format(v);

// Demo trend data (would come from API in real implementation)
const DEMO_TREND = [
  { date: "Mar 7", spend: 1800, leads: 48 },
  { date: "Mar 8", spend: 2100, leads: 52 },
  { date: "Mar 9", spend: 1950, leads: 49 },
  { date: "Mar 10", spend: 2200, leads: 58 },
  { date: "Mar 11", spend: 2400, leads: 62 },
  { date: "Mar 12", spend: 2300, leads: 59 },
  { date: "Mar 13", spend: 2150, leads: 55 },
];

export default function CampaignsRealtimePage() {
  const campaigns = useCampaignsRealtime();
  const { status, fallbackActive } = useConnectionStatus();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Calculate KPIs from realtime data
  const kpis = campaigns.reduce((acc, c) => ({
    spend: acc.spend + (c.spend || 0),
    leads: acc.leads + (c.leads || 0),
  }), { spend: 0, leads: 0 });
  
  const cpl = kpis.leads > 0 ? kpis.spend / kpis.leads : 0;
  
  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      {/* Header with Connection Status */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-[#FF6A00]"/>
              <h1 className="text-xl font-semibold">Campaigns</h1>
              {status === "connected" && campaigns.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-[#16C784]/20 text-[#16C784] rounded-full">
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-[#6B7280]">External marketing performance</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus showLabel={false} />
            <label className={`flex items-center gap-2 px-3 py-2 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors cursor-pointer ${importing ? "opacity-50" : ""}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              {importing ? "Importing..." : "Import"}
              <input type="file" accept=".csv" className="hidden" disabled={importing} />
            </label>
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Spend" value={fmt$(kpis.spend)} icon={DollarSign} loading={loading} />
        <KPICard label="Leads" value={fmtN(kpis.leads)} icon={Users} loading={loading} />
        <KPICard label="CPL" value={fmt$(cpl)} icon={Target} loading={loading} />
        <KPICard label="CAC" value="—" icon={Target} loading={loading} />
        <KPICard label="Booked" value="—" icon={Calendar} loading={loading} />
        <KPICard label="Closed" value="—" icon={CheckCircle} loading={loading} />
      </section>

      {/* Trend Chart */}
      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#9BA3AF]"/>
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">7-Day Trend</h2>
          {fallbackActive && (
            <span className="text-xs text-[#FFB020] ml-2">(Polling fallback)</span>
          )}
        </div>
        <div className="h-48">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_TREND}>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111214", border: "1px solid #1F2226" }} />
                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#FF6A00" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#16C784" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Campaigns Table */}
      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">
            Campaigns ({campaigns.length})
          </h2>
          {status === "connected" && !fallbackActive && (
            <span className="text-xs text-[#16C784]">● Live updates</span>
          )}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...
            </div>
          ) : campaigns.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2226]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Platform</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">Spend</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">Leads</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">CPL</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-[#1F2226] hover:bg-[#1F2226]/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-xs text-[#6B7280]">{c.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9BA3AF]">{c.platform}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt$(c.spend || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmtN(c.leads || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#9BA3AF]">{c.cpl > 0 ? fmt$(c.cpl) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${c.status === "active" ? "bg-[#16C784]/20 text-[#16C784]" : c.status === "paused" ? "bg-[#FFB020]/20 text-[#FFB020]" : "bg-[#6B7280]/20 text-[#6B7280]"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#6B7280]">
              No campaigns found. Import data to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, loading }: { label: string; value: string; icon: any; loading?: boolean }) {
  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#6B7280]"/>
        <span className="text-xs text-[#6B7280] uppercase">{label}</span>
      </div>
      {loading ? (
        <div className="h-6 bg-[#1F2226] rounded animate-pulse"/>
      ) : (
        <div className="text-xl font-mono font-medium text-white">{value}</div>
      )}
    </div>
  );
}
