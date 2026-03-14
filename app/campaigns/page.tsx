"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Users, DollarSign, Target, Calendar, CheckCircle, Megaphone, Upload, ChevronDown, ChevronUp } from "lucide-react";

const MOCK_CAMPAIGNS = [
  { id: "camp_001", name: "ARQIA Q1 Lead Gen", platform: "Meta Ads", company: "ARQIA", status: "active", spend: 12500, leads: 342, booked: 28, closed: 12, revenue: 48000 },
  { id: "camp_002", name: "ARQIA Retargeting", platform: "Meta Ads", company: "ARQIA", status: "active", spend: 8400, leads: 156, booked: 19, closed: 8, revenue: 32000 },
  { id: "camp_003", name: "ARQIA Lookalike", platform: "Meta Ads", company: "ARQIA", status: "paused", spend: 5200, leads: 89, booked: 7, closed: 3, revenue: 12000 },
  { id: "camp_004", name: "ManyChat Sequences", platform: "ManyChat", company: "ARQIA", status: "active", spend: 0, leads: 234, booked: 31, closed: 14, revenue: 56000 },
];

const TREND_DATA = [
  { date: "Mar 7", spend: 1800, leads: 48 },
  { date: "Mar 8", spend: 2100, leads: 52 },
  { date: "Mar 9", spend: 1950, leads: 49 },
  { date: "Mar 10", spend: 2200, leads: 58 },
  { date: "Mar 11", spend: 2400, leads: 62 },
  { date: "Mar 12", spend: 2300, leads: 59 },
  { date: "Mar 13", spend: 2150, leads: 55 },
];

const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtN = (v: number) => new Intl.NumberFormat("en-US").format(v);

export default function CampaignsPage() {
  const [companyFilter, setCompanyFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("spend");
  const [sortDir, setSortDir] = useState("desc");

  const kpis = useMemo(() => {
    const totals = MOCK_CAMPAIGNS.reduce((acc, c) => ({ 
      spend: acc.spend + c.spend, 
      leads: acc.leads + c.leads, 
      booked: acc.booked + c.booked, 
      closed: acc.closed + c.closed 
    }), { spend: 0, leads: 0, booked: 0, closed: 0 });
    return { 
      ...totals, 
      cpl: totals.leads > 0 ? totals.spend / totals.leads : 0, 
      cac: totals.closed > 0 ? totals.spend / totals.closed : 0 
    };
  }, []);

  const campaigns = useMemo(() => {
    let f = [...MOCK_CAMPAIGNS];
    if (companyFilter !== "all") f = f.filter(c => c.company.toLowerCase() === companyFilter);
    if (platformFilter !== "all") f = f.filter(c => c.platform.toLowerCase().includes(platformFilter));
    if (statusFilter !== "all") f = f.filter(c => c.status === statusFilter);
    f.sort((a, b) => { 
      const av = a[sortField], bv = b[sortField]; 
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return f;
  }, [companyFilter, platformFilter, statusFilter, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ f }: { f: string }) => {
    if (sortField !== f) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1"/> : <ChevronDown className="w-3 h-3 inline ml-1"/>;
  };

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
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]">
              <option value="all">All Companies</option>
              <option value="arqia">ARQIA</option>
            </select>
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]">
              <option value="all">All Platforms</option>
              <option value="meta">Meta</option>
              <option value="manychat">ManyChat</option>
            </select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF]">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors">
              <Upload className="w-4 h-4"/>Import
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Spend" value={fmt$(kpis.spend)} icon={DollarSign} trend="+12%" />
        <KPICard label="Leads" value={fmtN(kpis.leads)} icon={Users} trend="+8%" />
        <KPICard label="CPL" value={fmt$(kpis.cpl)} icon={Target} />
        <KPICard label="CAC" value={fmt$(kpis.cac)} icon={Target} />
        <KPICard label="Booked" value={fmtN(kpis.booked)} icon={Calendar} trend="+15%" />
        <KPICard label="Closed" value={fmtN(kpis.closed)} icon={CheckCircle} trend="+22%" />
      </section>

      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#9BA3AF]"/>
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">7-Day Trend</h2>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TREND_DATA}>
              <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#111214", border: "1px solid #1F2226", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
              <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#FF6A00" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#16C784" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1F2226]">
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Campaigns ({campaigns.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1F2226]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("name")}>Campaign <SortIcon f="name"/></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Platform</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("spend")}>Spend <SortIcon f="spend"/></th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase cursor-pointer hover:text-white" onClick={() => handleSort("leads")}>Leads <SortIcon f="leads"/></th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">CPL</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">Booked</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase">Closed</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b border-[#1F2226] hover:bg-[#1F2226]/30">
                  <td className="px-4 py-3"><div className="font-medium text-white">{c.name}</div></td>
                  <td className="px-4 py-3 text-sm text-[#9BA3AF]">{c.platform}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{fmt$(c.spend)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{fmtN(c.leads)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#9BA3AF]">{c.leads > 0 ? fmt$(c.spend / c.leads) : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{c.booked}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{c.closed}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${c.status === "active" ? "bg-[#16C784]/20 text-[#16C784]" : "bg-[#FFB020]/20 text-[#FFB020]"}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, trend }: { label: string; value: string; icon: any; trend?: string }) {
  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#6B7280]"/>
        <span className="text-xs text-[#6B7280] uppercase">{label}</span>
      </div>
      <div className="text-xl font-mono font-medium text-white">{value}</div>
      {trend && <div className="text-xs text-[#16C784] mt-1">{trend}</div>}
    </div>
  );
}
