/**
 * ATLAS-SALES-MARKETING-CAMPAIGNS-V2
 * ATLAS-SOPHIA-SALES-REALM-V2-013
 * 
 * Campaign management surface
 */

'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, TrendingUp, Users, DollarSign, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  platform: string;
  budget: number;
  spend: number;
  leads: number;
  cpl: number;
  start_date: string;
  end_date?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.campaigns || []);
      } else {
        setError(data.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Network error fetching campaigns');
    } finally {
      setLoading(false);
    }
  }

  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const activeCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6A00]/20 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Campaigns</h1>
              <p className="text-sm text-[#6B7280]">
                {activeCount} active · ${totalSpend.toLocaleString()} spent · {totalLeads} leads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCampaigns}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F2226] hover:bg-[#2A2D31] text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/campaigns/import"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6A00] hover:bg-[#FF8533] text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Import CSV
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
            <div className="flex items-center gap-2 text-[#6B7280] mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Spend</span>
            </div>
            <p className="text-2xl font-semibold">${totalSpend.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
            <div className="flex items-center gap-2 text-[#6B7280] mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total Leads</span>
            </div>
            <p className="text-2xl font-semibold">{totalLeads.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
            <div className="flex items-center gap-2 text-[#6B7280] mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Avg CPL</span>
            </div>
            <p className="text-2xl font-semibold">${avgCpl.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
            <div className="flex items-center gap-2 text-[#6B7280] mb-2">
              <Megaphone className="w-4 h-4" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1A1D21]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]">Campaign</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]">Platform</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#6B7280]">Spend</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#6B7280]">Leads</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#6B7280]">CPL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2226]">
              {campaigns.map(campaign => (
                <tr key={campaign.id} className="hover:bg-[#1A1D21]">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-[#6B7280]">
                        {new Date(campaign.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active' ? 'bg-[#16C784]/20 text-[#16C784]' :
                      campaign.status === 'paused' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      campaign.status === 'completed' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' :
                      'bg-[#6B7280]/20 text-[#6B7280]'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{campaign.platform}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    ${campaign.spend.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {campaign.leads.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    ${campaign.cpl.toFixed(2)}
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    No campaigns found. Import a CSV to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
