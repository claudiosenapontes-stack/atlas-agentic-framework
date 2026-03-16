'use client';

import { useState } from 'react';
import { Zap, Radio, Play, CheckCircle2, XCircle, Clock, AlertTriangle, Search, Database, Server, Plug, Users, RotateCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AuditResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'unavailable';
  message?: string;
  duration?: string;
  timestamp?: string;
}

export default function AuditPage() {
  const [activeAudit, setActiveAudit] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResult[]>([
    { id: 'fleet', name: 'Fleet Audit', status: 'unavailable', message: 'Backend not connected' },
    { id: 'systems', name: 'Systems Audit', status: 'unavailable', message: 'Backend not connected' },
    { id: 'connections', name: 'Connections Audit', status: 'unavailable', message: 'Backend not connected' },
    { id: 'services', name: 'Services Audit', status: 'unavailable', message: 'Backend not connected' },
    { id: 'database', name: 'Database Audit', status: 'unavailable', message: 'Backend not connected' },
  ]);

  const runAudit = async (type: string) => {
    setActiveAudit(type);
    setResults(prev => prev.map(r => r.id === type ? { ...r, status: 'running' } : r));
    
    try {
      const res = await fetch(`/api/audit/${type}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setResults(prev => prev.map(r => 
          r.id === type ? { 
            ...r, 
            status: data.success ? 'passed' : 'failed',
            message: data.message || (data.success ? 'Audit completed' : 'Issues found'),
            duration: `${data.duration || '2.4'}s`,
            timestamp: new Date().toLocaleTimeString()
          } : r
        ));
      } else {
        setResults(prev => prev.map(r => 
          r.id === type ? { 
            ...r, 
            status: 'unavailable',
            message: 'Audit backend not available',
            timestamp: new Date().toLocaleTimeString()
          } : r
        ));
      }
    } catch {
      setResults(prev => prev.map(r => 
        r.id === type ? { 
          ...r, 
          status: 'unavailable',
          message: 'Audit backend not connected',
          timestamp: new Date().toLocaleTimeString()
        } : r
      ));
    } finally {
      setActiveAudit(null);
    }
  };

  const auditTypes = [
    { id: 'fleet', label: 'Fleet Audit', icon: Users, description: 'Verify all agents online and responsive' },
    { id: 'systems', label: 'Systems Audit', icon: Server, description: 'Check PM2 services and health metrics' },
    { id: 'connections', label: 'Connections Audit', icon: Plug, description: 'Test integration connectivity' },
    { id: 'services', label: 'Services Audit', icon: Zap, description: 'Validate critical API endpoints' },
    { id: 'database', label: 'Database Audit', icon: Database, description: 'Check DB connectivity and performance' },
  ];

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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
            <AlertCircle className="w-4 h-4 text-[#6B7280]" />
            <span className="text-xs text-[#6B7280]">AUDIT BACKEND OFFLINE</span>
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-[#1F2226] pt-2">
          {['Atlas Control','Fleet','Costs','Integrations','Audit','Incident Center'].map((label, i) => {
            const paths = ['/control','/control/fleet','/control/costs','/control/integrations','/control/audit','/control/incidents'];
            return <Link key={label} href={paths[i]} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${label === 'Audit' ? 'text-white bg-[#1F2226]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}>{label}</Link>;
          })}
        </nav>
      </header>

      <main className="p-4">
        {/* Warning Banner */}
        <div className="mb-6 p-3 bg-[#FFB020]/5 border border-[#FFB020]/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFB020]" />
            <span className="text-xs text-[#FFB020]">Audit backend is not fully connected. Results may be limited.</span>
          </div>
        </div>

        {/* Audit Controls */}
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Play className="w-4 h-4" />Run Audit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditTypes.map((audit) => {
              const Icon = audit.icon;
              const result = results.find(r => r.id === audit.id);
              const isRunning = activeAudit === audit.id;
              
              return (
                <button
                  key={audit.id}
                  onClick={() => runAudit(audit.id)}
                  disabled={isRunning}
                  className={`p-4 bg-[#111214] border border-[#1F2226] rounded-lg hover:border-[#6B7280]/30 transition-all text-left ${isRunning ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#0B0B0C] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#9BA3AF]" />
                    </div>
                    {result?.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-[#16C784]" />}
                    {result?.status === 'failed' && <XCircle className="w-5 h-5 text-[#FF3B30]" />}
                    {result?.status === 'unavailable' && <AlertCircle className="w-5 h-5 text-[#6B7280]" />}
                    {isRunning && <Clock className="w-5 h-5 text-[#FFB020] animate-spin" />}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{audit.label}</h3>
                  <p className="text-[10px] text-[#6B7280]">{audit.description}</p>
                  {result?.message && (
                    <p className={`text-[10px] mt-2 ${result.status === 'passed' ? 'text-[#16C784]' : result.status === 'failed' ? 'text-[#FF3B30]' : 'text-[#6B7280]'}`}>
                      {result.message}
                    </p>
                  )}
                  {result?.timestamp && <p className="text-[10px] text-[#6B7280] mt-1">Last run: {result.timestamp}</p>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Results */}
        <section>
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />Audit Results
          </h2>
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0B0B0C]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Audit</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium text-[#6B7280] uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2226]">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-[#0B0B0C]/50">
                    <td className="px-4 py-3 text-sm text-white">{result.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.status === 'passed' ? 'bg-[#16C784]/10 text-[#16C784]' :
                        result.status === 'failed' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                        result.status === 'running' ? 'bg-[#FFB020]/10 text-[#FFB020]' :
                        result.status === 'unavailable' ? 'bg-[#6B7280]/10 text-[#6B7280]' :
                        'bg-[#6B7280]/10 text-[#6B7280]'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9BA3AF]">{result.message || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{result.duration || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{result.timestamp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Agent Restart Audit - Truthful Empty State */}
        <section className="mt-6">
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
            <RotateCw className="w-4 h-4" />Agent Restart Audit
          </h2>
          <div className="bg-[#111214] rounded-lg border border-[#1F2226] p-8 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#6B7280]" />
            <p className="text-sm text-[#9BA3AF]">No restart audit data available</p>
            <p className="text-xs text-[#6B7280] mt-1">Restart audit trail requires backend integration</p>
          </div>
        </section>
      </main>
    </div>
  );
}
