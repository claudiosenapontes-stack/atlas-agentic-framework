"use client";

import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Users, DollarSign, Target, Calendar, CheckCircle, Megaphone, Upload, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

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
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, trendRes, kpisRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/campaigns/trend"),
        fetch("/api/campaigns/kpis"),
      ]);
      if (campaignsRes.ok) setCampaigns((await campaignsRes.json()).campaigns || []);
      if (trendRes.ok) setTrendData((await trendRes.json()).data || []);
      if (kpisRes.ok) setKpis((await kpisRes.json()).kpis || null);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("company_id", "arqia");
    try {
      const res = await fetch("/api/campaigns/import", { method: "POST", body: formData });
      const result = await res.json();
      setImportResult(result);
      if (result.status === "success" || result.status === "partial") fetchData();
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
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-[#FF6A00]"/>
              <h1 className="text-xl font-semibold">Campaigns</h1>
            </div>
            <p className="text-sm text-[#6B7280]">External marketing performance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Companies</option><option value="arqia">ARQIA</option></select>
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Platforms</option><option value="meta">Meta</option><option value="manychat">ManyChat</option></select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option>Last 30 days</option><option>Last 7 days</option></select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]"><option value="all">All Status</option><option value="active">Active</option><option value="paused">Paused</option></select>
            <label className={`flex items-center gap-2 px-3 py-2 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors cursor-pointer ${importing ? "opacity-50" : ""}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              {importing ? "Importing..." : "Import"}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </div>
      </header>

      {importResult && (
        <div className={`mb-6 p-4 rounded-lg ${importResult.status === "success" ? "bg-green-900/30 border border-green-700" : importResult.status === "partial" ? "bg-yellow-900/30 border border-yellow-700" : "bg-red-900/30 border border-red-700"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Import {importResult.status}</p>
              <p className="text-sm text-[#9BA3AF]">{importResult.summary?.rows_accepted || 0} accepted, {importResult.summary?.rows_quarantined || 0} quarantined</p>
            </div>
            <button onClick={() => setImportResult(null)} className="text-sm text-[#9BA3AF] hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Spend" value={fmt$(displayKpis.total_spend)} icon={DollarSign} loading={loading} />
        <KPICard label="Leads" value={fmtN(displayKpis.total_leads)} icon={Users} loading={loading} />
        <KPICard label="CPL" value={fmt$(displayKpis.avg_cpl)} icon={Target} loading={loading} />
        <KPICard label="CAC" value={fmt$(displayKpis.avg_cac)} icon={Target} loading={loading} />
        <KPICard label="Booked" value={fmtN(displayKpis.total_booked_calls)} icon={Calendar} loading={loading} />
        <KPICard label="Closed" value={fmtN(displayKpis.total_closed_deals)} icon={CheckCircle} loading={loading} />
      </section>

      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#9BA3AF]"/>
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">7-Day Trend</h2>
        </div>
        <div className="h-48">
          {loading ? <div className="h-full flex items-center justify-center text-[#6B7280]"><Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading...</div> : trendData.length > 0 ? (
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
          {loading ? <div className="p-8 text-center text-[#6B7280]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</div> : (
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
                  <tr key={c.id} className="border-b border-[#1F2226] hover:bg-[#1F2226]/30">
                    <td className="px-4 py-3"><div className="font-medium text-white">{c.name}</div><div className="text-xs text-[#6B7280]">{c.id.slice(0, 20)}...</div></td>
                    <td className="px-4 py-3 text-sm text-[#9BA3AF]">{c.platform}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt$(c.spend)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmtN(c.leads)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#9BA3AF]">{fmt$(c.cpl)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs ${c.status === "active" ? "bg-[#16C784]/20 text-[#16C784]" : "bg-[#FFB020]/20 text-[#FFB020]"}`}>{c.status}</span></td>
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
