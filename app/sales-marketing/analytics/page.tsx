/**
 * ATLAS-SALES-MARKETING-ANALYTICS-V2
 * ATLAS-SOPHIA-SALES-REALM-V2-013
 * 
 * Sales & Marketing analytics dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  totalLeads: number;
  totalDeals: number;
  totalRevenue: number;
  conversionRate: number;
  avgDealSize: number;
  pipelineValue: number;
  leadsByStage: Record<string, number>;
  leadsBySource: Record<string, number>;
  monthlyTrend: { month: string; leads: number; deals: number; revenue: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);
    try {
      // Fetch leads for analytics
      const leadsResponse = await fetch('/api/leads?limit=1000');
      const leadsData = await leadsResponse.json();
      
      if (leadsData.success) {
        const leads = leadsData.leads || [];
        
        // Calculate analytics
        const totalLeads = leads.length;
        const convertedLeads = leads.filter((l: any) => l.status === 'converted');
        const totalDeals = convertedLeads.length;
        const totalRevenue = convertedLeads.reduce((sum: number, l: any) => sum + (l.estimated_value || 0), 0);
        const conversionRate = totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;
        const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
        const pipelineValue = leads.reduce((sum: number, l: any) => sum + (l.estimated_value || 0), 0);
        
        // Group by stage
        const leadsByStage: Record<string, number> = {};
        leads.forEach((l: any) => {
          leadsByStage[l.status] = (leadsByStage[l.status] || 0) + 1;
        });
        
        // Group by source
        const leadsBySource: Record<string, number> = {};
        leads.forEach((l: any) => {
          const source = l.source || 'unknown';
          leadsBySource[source] = (leadsBySource[source] || 0) + 1;
        });
        
        setData({
          totalLeads,
          totalDeals,
          totalRevenue,
          conversionRate,
          avgDealSize,
          pipelineValue,
          leadsByStage,
          leadsBySource,
          monthlyTrend: [],
        });
      } else {
        setError(leadsData.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Network error fetching analytics');
    } finally {
      setLoading(false);
    }
  }

  const stageColors: Record<string, string> = {
    new: '#3B82F6',
    contacted: '#F59E0B',
    qualified: '#8B5CF6',
    converted: '#16C784',
    lost: '#EF4444',
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6A00]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sales Analytics</h1>
              <p className="text-sm text-[#6B7280]">Pipeline performance and conversion metrics</p>
            </div>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F2226] hover:bg-[#2A2D31] text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* KPI Grid */}
        {data && (
          <>
            <div className="grid grid-cols-6 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Total Leads</span>
                </div>
                <p className="text-2xl font-semibold">{data.totalLeads}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Deals Won</span>
                </div>
                <p className="text-2xl font-semibold">{data.totalDeals}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Revenue</span>
                </div>
                <p className="text-2xl font-semibold">${data.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Conversion</span>
                </div>
                <p className="text-2xl font-semibold">{data.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Avg Deal</span>
                </div>
                <p className="text-2xl font-semibold">${data.avgDealSize.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Pipeline</span>
                </div>
                <p className="text-2xl font-semibold">${data.pipelineValue.toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pipeline Distribution */}
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <h3 className="text-lg font-medium mb-4">Pipeline by Stage</h3>
                <div className="space-y-3">
                  {Object.entries(data.leadsByStage).map(([stage, count]) => (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{stage}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1F2226] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0}%`,
                            backgroundColor: stageColors[stage] || '#6B7280',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Distribution */}
              <div className="p-4 rounded-lg bg-[#111214] border border-[#1F2226]">
                <h3 className="text-lg font-medium mb-4">Leads by Source</h3>
                <div className="space-y-3">
                  {Object.entries(data.leadsBySource).map(([source, count]) => (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{source}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1F2226] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FF6A00] transition-all"
                          style={{
                            width: `${data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
