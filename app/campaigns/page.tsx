"use client";

import { TrendingUp, Users, DollarSign, Target, Calendar, CheckCircle, Megaphone, AlertCircle } from "lucide-react";

// Campaigns page - Business analytics surface for external marketing
// Separate from /cost (internal operations finance)
export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-[#FF6A00]" />
              <h1 className="text-xl font-semibold text-white">Campaigns</h1>
            </div>
            <p className="text-sm text-[#6B7280]">External marketing performance</p>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF] focus:outline-none focus:border-[#6B7280]">
              <option>All Companies</option>
              <option>ARQIA</option>
              <option>Meta</option>
            </select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF] focus:outline-none focus:border-[#6B7280]">
              <option>All Platforms</option>
              <option>Meta Ads</option>
              <option>ManyChat</option>
              <option>Manual Import</option>
            </select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF] focus:outline-none focus:border-[#6B7280]">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
            <select className="px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-sm text-[#9BA3AF] focus:outline-none focus:border-[#6B7280]">
              <option>All Status</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Spend" value="—" prefix="$" icon={DollarSign} />
        <KPICard label="Leads" value="—" icon={Users} />
        <KPICard label="CPL" value="—" prefix="$" tooltip="Cost Per Lead" icon={Target} />
        <KPICard label="CAC" value="—" prefix="$" tooltip="Customer Acquisition Cost" icon={Target} />
        <KPICard label="Booked Calls" value="—" icon={Calendar} />
        <KPICard label="Closed Deals" value="—" icon={CheckCircle} />
      </section>

      {/* Split Row: Trend + Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#9BA3AF]" />
              <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Performance Trend</h2>
            </div>
            <span className="text-xs text-[#6B7280]">7 days</span>
          </div>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#6B7280] mb-2">No trend data available</p>
              <p className="text-xs text-[#6B7280]">Import campaigns to view performance trends</p>
            </div>
          </div>
        </div>

        {/* Alert Panel */}
        <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-[#9BA3AF]" />
            <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Integration Status</h2>
          </div>
          
          <div className="space-y-3">
            {/* Meta Ads */}
            <div className="p-3 rounded-lg bg-[#0B0B0C] border border-[#1F2226]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#FFB020]" />
                <span className="text-sm font-medium text-white">Meta Ads</span>
              </div>
              <p className="text-xs text-[#6B7280]">Meta API not connected — using manual import</p>
            </div>

            {/* ManyChat */}
            <div className="p-3 rounded-lg bg-[#0B0B0C] border border-[#1F2226]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#6B7280]" />
                <span className="text-sm font-medium text-white">ManyChat</span>
              </div>
              <p className="text-xs text-[#6B7280]">ManyChat not connected — reserved for next slice</p>
            </div>

            {/* Manual Import */}
            <div className="p-3 rounded-lg bg-[#0B0B0C] border border-[#1F2226]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#16C784]" />
                <span className="text-sm font-medium text-white">Manual Import</span>
              </div>
              <p className="text-xs text-[#6B7280]">Import campaigns via CSV available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Campaigns Table */}
      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[#1F2226] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Campaigns</h2>
          <button className="px-3 py-1.5 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors">
            Import CSV
          </button>
        </div>
        
        {/* Empty State */}
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1F2226] flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-6 h-6 text-[#6B7280]" />
          </div>
          <h3 className="text-base font-medium text-white mb-2">No campaign data loaded yet</h3>
          <p className="text-sm text-[#6B7280] mb-4">Import your first campaign to start tracking performance</p>
          <button className="px-4 py-2 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#FF6A00]/90 transition-colors">
            Import Campaigns
          </button>
        </div>
      </section>

      {/* Lower Panel: Leads & Attribution */}
      <section className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#9BA3AF]" />
          <h2 className="text-sm font-medium text-[#9BA3AF] uppercase tracking-wider">Latest Leads & Attribution</h2>
        </div>
        
        {/* Empty State */}
        <div className="p-8 text-center">
          <p className="text-sm text-[#6B7280]">No leads imported yet</p>
          <p className="text-xs text-[#6B7280] mt-1">Lead attribution will appear here after campaign import</p>
        </div>
      </section>
    </div>
  );
}

// KPI Card Component
function KPICard({ 
  label, 
  value, 
  prefix = "", 
  tooltip,
  icon: Icon 
}: { 
  label: string; 
  value: string; 
  prefix?: string;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-3" title={tooltip}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#6B7280]" />
        <span className="text-xs text-[#6B7280] uppercase">{label}</span>
      </div>
      <div className="text-xl font-mono font-medium text-white">
        {prefix}{value}
      </div>
    </div>
  );
}
