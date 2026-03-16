'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Recommendation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'pending_review' | 'applied' | 'rejected';
  createdAt: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('unavailable');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending_review' | 'applied' | 'rejected' | 'all'>('all');

  useEffect(() => { 
    fetchRecommendations(); 
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setDataSource('live');
        setLastSync(new Date().toISOString());
      } else {
        setDataSource('unavailable');
        setRecommendations([]);
      }
    } catch (err) {
      console.error('[Recommendations] Error fetching:', err);
      setDataSource('unavailable');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'apply' | 'reject') => {
    try {
      const res = await fetch(`/api/recommendations/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setRecommendations(prev => prev.map(r => 
          r.id === id ? { ...r, status: action === 'apply' ? 'applied' : 'rejected' } : r
        ));
      }
    } catch (err) {
      console.error('[Recommendations] Action failed:', err);
    }
  };

  const filtered = filter === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.status === filter);
  
  const stats = { 
    pending: recommendations.filter(r => r.status === 'pending_review').length, 
    applied: recommendations.filter(r => r.status === 'applied').length, 
    rejected: recommendations.filter(r => r.status === 'rejected').length 
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Header */}
      <header className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Recommendations</h1>
              <p className="text-[10px] text-[#6B7280]">AI-driven optimization center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30">
                <CheckCircle className="w-4 h-4 text-[#16C784]" />
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
      </header>

      <main className="p-4 sm:p-6">
        {/* Data Status */}
        <div className="flex items-center justify-between p-3 bg-[#111214] rounded-lg border border-[#1F2226] mb-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-[#16C784]' : 'bg-[#6B7280]'}`} />
            <span className="text-xs text-[#9BA3AF]">
              {dataSource === 'live' 
                ? `Recommendations active • ${lastSync ? new Date(lastSync).toLocaleTimeString() : 'Just now'}` 
                : 'Recommendations engine not yet connected'}
            </span>
          </div>
          <button onClick={fetchRecommendations} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9BA3AF] hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Applied" value={stats.applied} color="green" />
          <StatCard label="Rejected" value={stats.rejected} color="red" />
        </div>

        {/* Empty State */}
        {dataSource === 'unavailable' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
            <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-[#6B7280]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Recommendations Not Available</h2>
            <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-6">
              The AI recommendations engine is not yet connected. Optimization suggestions will appear once the service is deployed.
            </p>
            <button onClick={fetchRecommendations} disabled={loading} className="px-4 py-2 bg-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white transition-colors">
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {(['all', 'pending_review', 'applied', 'rejected'] as const).map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f 
                      ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30' 
                      : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
                  }`}
                >
                  {f === 'all' ? 'ALL' : f.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            {/* Recommendations List */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-[#6B7280]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-[#111214] rounded-[10px] border border-[#1F2226]">
                <Lightbulb className="w-8 h-8 text-[#6B7280] mb-4" />
                <p className="text-sm text-[#9BA3AF]">No recommendations found</p>
                <p className="text-xs text-[#6B7280] mt-1">AI suggestions will appear here when available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} onAction={handleAction} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'amber' | 'green' | 'red' }) {
  const colors = { 
    amber: 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30', 
    green: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30', 
    red: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30' 
  };
  return (
    <div className={`p-4 rounded-[10px] border ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

function RecommendationCard({ rec, onAction }: { rec: Recommendation; onAction: (id: string, action: 'apply' | 'reject') => void }) {
  const priorityColors = { 
    critical: 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/30', 
    high: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/30', 
    medium: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30', 
    low: 'text-[#6B7280] bg-[#1F2226] border-[#1F2226]' 
  };

  const statusIcons = {
    pending_review: null,
    applied: <CheckCircle className="w-4 h-4 text-[#16C784]" />,
    rejected: <XCircle className="w-4 h-4 text-[#FF3B30]" />
  };

  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${priorityColors[rec.priority]}`}>
              {rec.priority}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#1F2226] text-[#9BA3AF]">
              {rec.type.replace('_', ' ')}
            </span>
            {rec.status !== 'pending_review' && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                rec.status === 'applied' ? 'bg-[#16C784]/10 text-[#16C784]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
              }`}>
                {statusIcons[rec.status]}
                {rec.status}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-white mb-1">{rec.title}</h3>
          <p className="text-xs text-[#9BA3AF] mb-3">{rec.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
            <Clock className="w-3 h-3" />
            Created {new Date(rec.createdAt).toLocaleString()}
          </div>
        </div>
        {rec.status === 'pending_review' && (
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => onAction(rec.id, 'apply')} 
              className="px-3 py-1.5 bg-[#16C784]/20 hover:bg-[#16C784]/30 text-[#16C784] rounded-lg text-xs font-medium transition-colors"
            >
              Apply
            </button>
            <button 
              onClick={() => onAction(rec.id, 'reject')} 
              className="px-3 py-1.5 bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] rounded-lg text-xs font-medium transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
