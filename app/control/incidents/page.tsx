'use client';

import { useState, useEffect } from 'react';
import { Zap, Radio, AlertTriangle, CheckCircle2, Clock, XCircle, AlertCircle, Shield, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Incident {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  service: string;
  createdAt: string;
  resolvedAt?: string;
  assignee?: string;
}

export default function IncidentsPage() {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIncidents() {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        setDataSource('live');
      } else {
        setIncidents([]);
        setDataSource('unavailable');
      }
    } catch (err) {
      console.error('[Incidents] Error:', err);
      setDataSource('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = incidents.filter(i => 
    filter === 'all' ? true : filter === 'open' ? i.status !== 'resolved' : i.status === 'resolved'
  );

  const stats = {
    open: incidents.filter(i => i.status !== 'resolved').length,
    critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-[#FF3B30]" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-[#FF6A00]" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-[#FFB020]" />;
      default: return <Clock className="w-4 h-4 text-[#6B7280]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="text-xs px-2 py-0.5 rounded bg-[#FF3B30]/10 text-[#FF3B30]">Open</span>;
      case 'acknowledged': return <span className="text-xs px-2 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020]">Acknowledged</span>;
      case 'resolved': return <span className="text-xs px-2 py-0.5 rounded bg-[#16C784]/10 text-[#16C784]">Resolved</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Atlas OS Control</h1>
              <p className="text-[10px] text-[#6B7280]">System Integrity Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <Radio className="w-4 h-4 text-[#16C784] animate-pulse" />
                <span className="text-xs text-[#16C784]">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {['Atlas Control','Fleet','Costs','Integrations','Audit','Incident Center'].map((label, i) => {
            const paths = ['/control','/control/fleet','/control/costs','/control/integrations','/control/audit','/control/incidents'];
            return <Link key={label} href={paths[i]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${label === 'Incident Center' ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>{label}</Link>;
          })}
        </nav>
      </header>

      <main className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[#FFB020]" />
              <span className="text-[10px] text-[#6B7280] uppercase">Open</span>
            </div>
            <p className="text-2xl font-semibold text-white">{stats.open}</p>
          </div>
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-[10px] text-[#6B7280] uppercase">Critical</span>
            </div>
            <p className="text-2xl font-semibold text-[#FF3B30]">{stats.critical}</p>
          </div>
          <div className="bg-[#111214] border border-[#1F2226] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
              <span className="text-[10px] text-[#6B7280] uppercase">Resolved</span>
            </div>
            <p className="text-2xl font-semibold text-[#16C784]">{stats.resolved}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" />Incidents
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={fetchIncidents} disabled={loading} className="flex items-center gap-1 px-2 py-1 text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
            <Filter className="w-4 h-4 text-[#6B7280]" />
            {(['all', 'open', 'resolved'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-lg transition-colors ${filter === f ? 'bg-[#1F2226] text-white' : 'text-[#6B7280] hover:text-white'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents List */}
        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-lg border border-[#1F2226]">
            <AlertCircle className="w-8 h-8 text-[#6B7280] mb-4" />
            <p className="text-sm text-[#9BA3AF]">Incident tracking not yet connected</p>
            <p className="text-xs text-[#6B7280] mt-1">Incident backend requires integration</p>
            <button onClick={fetchIncidents} disabled={loading} className="mt-4 px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-lg border border-[#1F2226]">
            <CheckCircle2 className="w-8 h-8 text-[#16C784] mb-4" />
            <p className="text-sm text-[#9BA3AF]">No active incidents</p>
            <p className="text-xs text-[#6B7280] mt-1">System is healthy</p>
          </div>
        ) : (
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0B0B0C]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Assignee</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2226]">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-[#0B0B0C]/50">
                    <td className="px-4 py-3 text-xs font-mono text-[#9BA3AF]">{incident.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(incident.severity)}
                        <span className={`text-xs capitalize ${
                          incident.severity === 'critical' ? 'text-[#FF3B30]' :
                          incident.severity === 'high' ? 'text-[#FF6A00]' :
                          incident.severity === 'medium' ? 'text-[#FFB020]' :
                          'text-[#6B7280]'
                        }`}>{incident.severity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9BA3AF]">{incident.service}</td>
                    <td className="px-4 py-3 text-sm text-white">{incident.message}</td>
                    <td className="px-4 py-3">{getStatusBadge(incident.status)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{incident.assignee || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{incident.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
