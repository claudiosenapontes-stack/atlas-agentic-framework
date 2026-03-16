'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Target, ArrowLeft, Users, CheckCircle2, Clock, AlertCircle, 
  Flag, Shield, FileText, MessageSquare, XCircle, CheckCircle,
  RefreshCw, ChevronRight
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

interface Mission {
  id: string;
  title: string;
  objective: string;
  owner: string;
  phase: string;
  status: string;
  realm: string;
  percentComplete: number;
  successCriteria: string;
  assignedAgents: string[];
  evidenceReceived: string[];
  henryAuditVerdict: string;
  currentBlocker: string | null;
  childTasks: Task[];
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  in_progress: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  blocked: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

const taskStatusIcons: Record<string, any> = {
  completed: CheckCircle2,
  in_progress: Clock,
  pending: CheckCircle,
};

const taskStatusColors: Record<string, string> = {
  completed: 'text-[#16C784]',
  in_progress: 'text-[#3B82F6]',
  pending: 'text-[#6B7280]',
};

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params.id as string;
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMission() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMission(data.mission);
      } else {
        setError('Mission not found');
      }
    } catch (err) {
      setError('Failed to load mission');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMission();
  }, [missionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-[#6B7280] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-4 sm:p-6">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[#FF3B30]" />
          <h2 className="text-xl font-semibold text-white mb-2">{error || 'Mission not found'}</h2>
          <Link href="/operations/missions" className="text-[#3B82F6] hover:underline">
            ← Back to Missions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Back Navigation */}
        <Link 
          href="/operations/missions"
          className="inline-flex items-center gap-2 text-sm text-[#9BA3AF] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Missions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${statusColors[mission.status]}`}>
                  {mission.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] text-[#9BA3AF]">
                  {mission.realm}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] text-[#9BA3AF]">
                  Phase: {mission.phase}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-white">{mission.title}</h1>
            </div>
          </div>
          <p className="text-sm text-[#9BA3AF] max-w-3xl">{mission.objective}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#9BA3AF]">Mission Progress</span>
            <span className="text-lg font-semibold text-white">{mission.percentComplete}%</span>
          </div>
          <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF6A00] to-[#FFB020] rounded-full transition-all"
              style={{ width: `${mission.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Success Criteria */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[#16C784]" />
                <h3 className="text-sm font-medium text-white">Success Criteria</h3>
              </div>
              <p className="text-sm text-[#9BA3AF]">{mission.successCriteria}</p>
            </div>

            {/* Child Tasks */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-sm font-medium text-white">Child Tasks</h3>
                </div>
                <span className="text-xs text-[#6B7280]">
                  {mission.childTasks.filter(t => t.status === 'completed').length} / {mission.childTasks.length} completed
                </span>
              </div>
              <div className="space-y-2">
                {mission.childTasks.map((task) => {
                  const Icon = taskStatusIcons[task.status] || Clock;
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-[#1F2226] rounded-lg">
                      <Icon className={`w-4 h-4 ${taskStatusColors[task.status]}`} />
                      <div className="flex-1">
                        <p className="text-sm text-white">{task.title}</p>
                        <p className="text-xs text-[#6B7280]">Assigned to: {task.assignee}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence Received */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#FFB020]" />
                <h3 className="text-sm font-medium text-white">Evidence Received</h3>
              </div>
              {mission.evidenceReceived.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {mission.evidenceReceived.map((evidence, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 bg-[#16C784]/10 border border-[#16C784]/30 rounded-lg text-sm text-[#16C784]"
                    >
                      {evidence}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280]">No evidence submitted yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Status & Blockers */}
          <div className="space-y-6">
            {/* Owner & Team */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#9BA3AF]" />
                <h3 className="text-sm font-medium text-white">Team</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Mission Owner</p>
                  <p className="text-sm font-medium text-white">{mission.owner}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-2">Assigned Agents</p>
                  <div className="flex flex-wrap gap-2">
                    {mission.assignedAgents.map((agent) => (
                      <span 
                        key={agent}
                        className="px-2 py-1 bg-[#1F2226] rounded text-xs text-[#9BA3AF]"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Henry's Audit Verdict */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[#FF6A00]" />
                <h3 className="text-sm font-medium text-white">Henry's Audit Verdict</h3>
              </div>
              <div className={`p-3 rounded-lg border ${
                mission.henryAuditVerdict === 'approved' ? 'bg-[#16C784]/10 border-[#16C784]/30' :
                mission.henryAuditVerdict === 'needs_work' ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30' :
                'bg-[#FFB020]/10 border-[#FFB020]/30'
              }`}>
                <div className="flex items-center gap-2">
                  {mission.henryAuditVerdict === 'approved' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                  ) : mission.henryAuditVerdict === 'needs_work' ? (
                    <XCircle className="w-4 h-4 text-[#FF3B30]" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#FFB020]" />
                  )}
                  <span className={`text-sm font-medium ${
                    mission.henryAuditVerdict === 'approved' ? 'text-[#16C784]' :
                    mission.henryAuditVerdict === 'needs_work' ? 'text-[#FF3B30]' :
                    'text-[#FFB020]'
                  }`}>
                    {mission.henryAuditVerdict === 'approved' ? 'APPROVED' :
                     mission.henryAuditVerdict === 'needs_work' ? 'NEEDS WORK' :
                     'PENDING REVIEW'}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Blocker */}
            {mission.currentBlocker && (
              <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/30 rounded-[10px] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                  <h3 className="text-sm font-medium text-[#FF3B30]">Current Blocker</h3>
                </div>
                <p className="text-sm text-white/80">{mission.currentBlocker}</p>
              </div>
            )}

            {/* Mission Metadata */}
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <p className="text-xs text-[#6B7280] mb-1">Created</p>
              <p className="text-sm text-white mb-3">{new Date(mission.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-[#6B7280] mb-1">Last Updated</p>
              <p className="text-sm text-white">{new Date(mission.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
