/**
 * ATLAS-SALES-MARKETING-PIPELINE-V2
 * ATLAS-SOPHIA-SALES-REALM-V2-013
 * 
 * Full pipeline Kanban with stage transitions
 * Stages: new → contacted → qualified → deal
 */

'use client';

import { useState, useEffect } from 'react';
import { Target, AlertCircle, RefreshCw, Plus, ChevronRight, ChevronLeft, User, Building, DollarSign, Calendar, Flame } from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  estimated_value?: number;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  assigned_to?: string;
  created_at: string;
  last_contact_at?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  status: Lead['status'];
  color: string;
  count: number;
  value: number;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'new', name: 'New Leads', status: 'new', color: '#3B82F6', count: 0, value: 0 },
  { id: 'contacted', name: 'Contacted', status: 'contacted', color: '#F59E0B', count: 0, value: 0 },
  { id: 'qualified', name: 'Qualified', status: 'qualified', color: '#8B5CF6', count: 0, value: 0 },
  { id: 'converted', name: 'Won Deals', status: 'converted', color: '#16C784', count: 0, value: 0 },
  { id: 'lost', name: 'Lost', status: 'lost', color: '#EF4444', count: 0, value: 0 },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leads?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads || []);
      } else {
        setError(data.error || 'Failed to fetch leads');
      }
    } catch (err) {
      setError('Network error fetching leads');
    } finally {
      setLoading(false);
    }
  }

  async function transitionLead(leadId: string, newStatus: Lead['status']) {
    setIsTransitioning(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          last_contact_at: new Date().toISOString()
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setLeads(prev => prev.map(l => 
          l.id === leadId ? { ...l, status: newStatus, last_contact_at: new Date().toISOString() } : l
        ));
        setSelectedLead(null);
      } else {
        setError(data.error || 'Failed to transition lead');
      }
    } catch (err) {
      setError('Network error transitioning lead');
    } finally {
      setIsTransitioning(false);
    }
  }

  const getStageLeads = (status: Lead['status']) => leads.filter(l => l.status === status);
  
  const getStageStats = (status: Lead['status']) => {
    const stageLeads = getStageLeads(status);
    return {
      count: stageLeads.length,
      value: stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
    };
  };

  const stages = PIPELINE_STAGES.map(stage => ({
    ...stage,
    ...getStageStats(stage.status),
  }));

  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
  const totalLeads = leads.length;

  const getNextStage = (current: Lead['status']): Lead['status'] | null => {
    const flow: Record<Lead['status'], Lead['status'] | null> = {
      new: 'contacted',
      contacted: 'qualified',
      qualified: 'converted',
      converted: null,
      lost: null,
    };
    return flow[current];
  };

  const getPrevStage = (current: Lead['status']): Lead['status'] | null => {
    const flow: Record<Lead['status'], Lead['status'] | null> = {
      new: null,
      contacted: 'new',
      qualified: 'contacted',
      converted: 'qualified',
      lost: null,
    };
    return flow[current];
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6A00]/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sales Pipeline</h1>
              <p className="text-sm text-[#6B7280]">
                {totalLeads} leads · ${totalValue.toLocaleString()} pipeline value
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F2226] hover:bg-[#2A2D31] text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/hot-leads"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6A00] hover:bg-[#FF8533] text-white transition-colors"
            >
              <Flame className="w-4 h-4" />
              Hot Leads
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Pipeline Board */}
        <div className="grid grid-cols-5 gap-4">
          {stages.map(stage => (
            <div key={stage.id} className="bg-[#111214] rounded-lg border border-[#1F2226]">
              {/* Stage Header */}
              <div 
                className="p-3 border-b border-[#1F2226] rounded-t-lg"
                style={{ borderTop: `3px solid ${stage.color}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-white">{stage.name}</h3>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                  >
                    {stage.count}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  ${stage.value.toLocaleString()}
                </p>
              </div>

              {/* Stage Leads */}
              <div className="p-2 space-y-2 min-h-[400px]">
                {getStageLeads(stage.status).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="p-3 rounded-lg bg-[#1A1D21] hover:bg-[#2A2D31] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#6B7280]" />
                        <span className="font-medium text-sm">{lead.name}</span>
                      </div>
                      {lead.score >= 80 && (
                        <Flame className="w-4 h-4 text-[#FF6A00]" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-2">
                      <Building className="w-3 h-3" />
                      {lead.company}
                    </div>
                    
                    {lead.estimated_value && (
                      <div className="flex items-center gap-1 text-xs text-[#16C784]">
                        <DollarSign className="w-3 h-3" />
                        {lead.estimated_value.toLocaleString()}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#2A2D31] opacity-0 group-hover:opacity-100 transition-opacity">
                      {getPrevStage(lead.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            transitionLead(lead.id, getPrevStage(lead.status)!);
                          }}
                          disabled={isTransitioning}
                          className="p-1 rounded hover:bg-[#3A3D41] text-[#6B7280]"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {getNextStage(lead.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            transitionLead(lead.id, getNextStage(lead.status)!);
                          }}
                          disabled={isTransitioning}
                          className="p-1 rounded hover:bg-[#3A3D41] text-[#16C784]"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Lead Details</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-[#6B7280] hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs text-[#6B7280]">Name</label>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-xs text-[#6B7280]">Email</label>
                  <p className="text-sm">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="text-xs text-[#6B7280]">Company</label>
                  <p className="text-sm">{selectedLead.company}</p>
                </div>
                <div>
                  <label className="text-xs text-[#6B7280]">Status</label>
                  <p className="text-sm capitalize">{selectedLead.status}</p>
                </div>
                {selectedLead.estimated_value && (
                  <div>
                    <label className="text-xs text-[#6B7280]">Estimated Value</label>
                    <p className="text-sm text-[#16C784]">
                      ${selectedLead.estimated_value.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Stage Transition */}
              <div className="flex items-center gap-2">
                {getPrevStage(selectedLead.status) && (
                  <button
                    onClick={() => transitionLead(selectedLead.id, getPrevStage(selectedLead.status)!)}
                    disabled={isTransitioning}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1F2226] hover:bg-[#2A2D31] text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Move Back
                  </button>
                )}
                {getNextStage(selectedLead.status) && (
                  <button
                    onClick={() => transitionLead(selectedLead.id, getNextStage(selectedLead.status)!)}
                    disabled={isTransitioning}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#16C784] hover:bg-[#16C784]/90 text-white transition-colors"
                  >
                    Advance
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
