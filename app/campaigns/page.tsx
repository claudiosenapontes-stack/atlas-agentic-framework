"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Users, DollarSign, Target, Calendar, CheckCircle, Megaphone, Upload, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useLiveCampaigns } from "@/hooks/useLiveCampaigns";
import { DataStatus } from "@/components/ui/DataStatus";
import { EmptyState } from "@/components/ui/EmptyState";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "archived";
  spend: number;
  leads: number;
  cpl: number;
}

interface TrendPoint {
  date: string;
  spend: number;
  leads: number;
}

interface KPIs {
  total_spend: number;
  total_leads: number;
  avg_cpl: number;
  total_booked_calls: number;
  total_closed_deals: number;
  avg_cac: number;
}

const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtN = (v: number) => new Intl.NumberFormat("en-US").format(v);

export default function CampaignsPage() {
  const [companyFilter, setCompanyFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("spend");
  const [sortDir, setSortDir] = useState("desc");
  
  const { campaigns, trendData, kpis, source, lastSync, error, loading, syncing, refresh } = useLiveCampaigns({ pollingInterval: 30000 });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("company_id", "arqia");
    try {
      const res = await fetch("/api/campaigns/import", { method: "POST", body: formData });
      const result = await res.json();
      setImportResult(result);
      if (result.status === "success" || result.status === "partial") refresh();
    } catch (err) {
      setImportResult({ status: "failed", error: "Network error" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const filteredCampaigns = useMemo(() => {
    let f = [...campaigns];
    if (platformFilter !== "all") f = f.filter(c => c.platform?.toLowerCase().includes(platformFilter));
    if (statusFilter !== "all") f = f.filter(c => c.status === statusFilter);
    f.sort((a, b) => { 
      const av = a[sortField as keyof Campaign], bv = b[sortField as keyof Campaign]; 
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return f;
  }, [campaigns, platformFilter, statusFilter, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ f }: { f: string }) => sortField !== f ? null : sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1"/> : <ChevronDown className="w-3 h-3 inline ml-1"/>;

  const displayKpis = kpis || { total_spend: 0, total_leads: 0, avg_cpl: 0, total_booked_calls: 0, total_closed_deals: 0, avg_cac: 0 };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Megaphone className="w-5 h-5 text-[#FF6A00]"/>
              <h1 className="text-xl font-semibold">Campaigns</h1>
              <DataStatus source={source} lastSync={lastSync} syncing={syncing} error={error} />
            </div>
            <p className="text-sm text-[#6B7280]">External marketing performance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Companies</option><option value="arqia">ARQIA</option></select>
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Platforms</option><option value="meta">Meta</option><option value="manychat">ManyChat</option></select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option>Last 30 days</option><option>Last 7 days</option></select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Status</option><option value="active">Active</option><option value="paused">Paused</option></select>
            <button onClick={refresh} disabled={loading || syncing} className="p-2 bg-[#111214] border border-[#1F2226] rounded-lg text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] transition-colors disabled:opacity-50" title="Refresh data"><RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /></button>
            <label className={`flex items-center gap-2 px-3 py-2 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors cursor-pointer ${importing ? "opacity-50" : ""}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              {importing ? "Importing..." : "Import"}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </div>
      </header>

      {importResult && (
        <div className={`mb-6 p-4 rounded-lg ${importResult.status === "success" ? "bg-[#16C784]/10 border border-[#16C784]/30" : importResult.status === "partial" ? "bg-[#FFB020]/10 border border-[#FFB020]/30" : "bg-[#FF3B30]/10 border border-[#FF3B30]/30"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {importResult.status === "success" ? <CheckCircle className="w-4 h-4 text-[#16C784]" /> : <AlertCircle className={`w-4 h-4 ${importResult.status === "partial" ? "text-[#FFB020]" : "text-[#FF3B30]"}`} />}
              <div>
                <p className={`font-medium ${importResult.status === "success" ? "text-[#16C784]" : importResult.status === "partial" ? "text-[#FFB020]" : "text-[#FF3B30]"}`}>Import {importResult.status}</p>
                <p className="text-sm text-[#9BA3AF]">{importResult.summary?.rows_accepted || 0} accepted{importResult.summary?.rows_quarantined ? `, ${importResult.summary.rows_quarantined} quarantined` : ""}</p>
              </div>
            </div>
            <button onClick={() => setImportResult(null)} className="text-sm text-[#9BA3AF] hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Spend" value={fmt$(displayKpis.total_spend)} icon={DollarSign} loading={loading} />
        <KPICard label="Leads" value={fmtN(displayKpis.total_leads)} icon={Users} loading={loading} />
        <KPICard label="CPL" value={displayKpis.avg_cpl > 0 ? fmt$(displayKpis.avg_cpl) : "—"} icon={Target} loading={loading} />
        <KPICard label="CAC" value={displayKpis.avg_cac > 0 ? fmt$(displayKpis.avg_cac) : "—"} icon={Target} loading={loading} />
        <KPICard label="Booked" value={displayKpis.total_booked_calls > 0 ? fmtN(displayKpis.total_booked_calls) : "—"} icon={Calendar} loading={loading} />
        <KPICard label="Closed" value={displayKpis.total_closed_deals > 0 ? fmtN(displayKpis.total_closed_deals) : "—"} icon={CheckCircle} loading={loading} />
      </section>

      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#9BA3AF]"/>
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">7-Day Trend</h2>
          {syncing && <span className="text-xs text-[#6B7280] ml-2">(updating...)</span>}
        </div>
        <div className="h-48">
          {loading ? <div className="h-full flex items-center justify-center text-[#6B7280]"><Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading chart...</div> : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", {month: "short", day: "numeric"})} />
                <YAxis yAxisId="left" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111214", border: "1px solid #1F2226", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#FF6A00" strokeWidth={2} dot={false} name="Spend ($)" />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#16C784" strokeWidth={2} dot={false} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-[#6B7280]">No trend data</div>}
        </div>
      </section>

      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1F2226]">
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Campaigns ({filteredCampaigns.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? <EmptyState type="loading" /> : error ? <EmptyState type="error" message={error} onAction={refresh} actionLabel="Try again" /> : filteredCampaigns.length === 0 ? <EmptyState type="empty" onAction={() => {}} /> : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2226]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("name")}>Campaign <SortIcon f="name"/></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Platform</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("spend")}>Spend <SortIcon f="spend"/></th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("leads")}>Leads <SortIcon f="leads"/></th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">CPL</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(c => (
                  <tr key={c.id} className="border-b border-[#1F2226] hover:bg-[#1F2226]/30 transition-colors">
                    <td className="px-4 py-3"><div className="font-medium text-white">{c.name}</div><div className="text-xs text-[#6B7280]">{c.id.slice(0, 20)}...</div></td>
                    <td className="px-4 py-3 text-sm text-[#9BA3AF]">{c.platform}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt$(c.spend)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmtN(c.leads)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#9BA3AF]">{c.cpl > 0 ? fmt$(c.cpl) : "—"}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs ${c.status === "active" ? "bg-[#16C784]/20 text-[#16C784]" : c.status === "paused" ? "bg-[#FFB020]/20 text-[#FFB020]" : "bg-[#6B7280]/20 text-[#6B7280]"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      {loading ? <div className="h-6 bg-[#1F2226] rounded animate-pulse"/> : <div className="text-xl font-mono font-medium text-white">{value}</div>}
    </div>
  );
}
