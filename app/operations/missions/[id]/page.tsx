'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Target, ArrowLeft, Users, CheckCircle2, Clock, AlertCircle,
  Flag, Shield, FileText, Rocket, Loader2, CheckCircle
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  objective?: string;
  description?: string;
  owner_agent?: string;
  owner_id?: string;
  phase: string;
  status: string;
  priority: string;
  progress_percent: number;
  child_task_count: number;
  completed_task_count: number;
  target_start_date?: string;
  target_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  success_criteria?: any[];
  evidence_bundle?: any;
  henry_audit_verdict?: string;
  current_blocker?: string | null;
  closure_confidence?: number;
  metadata?: any;
  category?: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee_agent?: string;
  assignee_id?: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  pending: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  active: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  in_progress: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  closed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
  cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
};

const phaseColors: Record<string, string> = {
  planning: 'text-[#6B7280]',
  execution: 'text-[#3B82F6]',
  verification: 'text-[#FF6A00]',
  closure: 'text-[#16C784]',
};

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params.id as string;
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch mission data
  useEffect(() => {
    async function fetchMission() {
      try {
        setLoading(true);
        const response = await fetch(`/api/missions/${missionId}?include_tasks=true`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Mission not found');
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          setMission(data.mission);
          setTasks(data.mission?.mission_tasks?.map((mt: any) => ({
            id: mt.task_id,
            title: mt.tasks?.title || 'Untitled Task',
            status: mt.tasks?.status || 'pending',
            assignee_agent: mt.tasks?.assignee_agent,
            assignee_id: mt.tasks?.assignee_id,
          })) || []);
        } else {
          setError(data.error || 'Failed to load mission');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load mission');
      } finally {
        setLoading(false);
      }
    }

    if (missionId) {
      fetchMission();
    }
  }, [missionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#9BA3AF]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading mission...</span>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-6">
        <Link href="/operations/missions" className="text-[#9BA3AF] hover:text-white">← Back</Link>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[#FF3B30]" />
          <h2 className="text-xl font-semibold text-white">{error || 'Mission not found'}</h2>
        </div>
      </div>
    );
  }

  const evidence = mission.evidence_bundle || [];
  const successCriteria = mission.success_criteria || [];
  
  // Get Henry verdict from multiple possible field names
  const henryVerdict = mission.henry_audit_verdict || (mission as any).henryAuditVerdict || 'pending';
  const currentBlocker = mission.current_blocker || (mission as any).currentBlocker || null;
  const closureConfidence = (mission as any).closure_confidence || (mission as any).closureConfidence || 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-6">
      <Link href="/operations/missions" className="text-[#9BA3AF] hover:text-white mb-6 inline-block">← Back to Missions</Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${statusColors[mission.status] || statusColors.draft}`}>
                {mission.status}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[#1F2226] ${phaseColors[mission.phase] || phaseColors.planning}`}>
                {mission.phase}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white mt-1">{mission.title}</h1>
          </div>
        </div>
        <p className="text-sm text-[#9BA3AF]">{mission.objective || mission.description || 'No objective set'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Progress</h3>
              <span className="text-sm text-white font-medium">{mission.progress_percent || 0}%</span>
            </div>
            <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#FF6A00] rounded-full transition-all" style={{ width: `${mission.progress_percent || 0}%` }} />
            </div>
            <p className="text-xs text-[#6B7280]">
              {mission.completed_task_count || 0} of {mission.child_task_count || 0} tasks completed
            </p>
          </div>

          {/* Success Criteria */}
          {successCriteria.length > 0 && (
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <h3 className="text-sm font-medium text-white mb-3">Success Criteria</h3>
              <ul className="space-y-2">
                {successCriteria.map((criterion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#9BA3AF]">
                    <CheckCircle className="w-4 h-4 text-[#16C784] mt-0.5 flex-shrink-0" />
                    <span>{typeof criterion === 'string' ? criterion : criterion.description || JSON.stringify(criterion)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <h3 className="text-sm font-medium text-white mb-3">Tasks ({tasks.length})</h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-[#1F2226] rounded-lg">
                    {task.status === 'completed' ? 
                      <CheckCircle2 className="w-4 h-4 text-[#16C784]" /> : 
                      <Clock className="w-4 h-4 text-[#3B82F6]" />
                    }
                    <span className="text-sm text-white">{task.title}</span>
                    <span className="text-xs text-[#6B7280] ml-auto">{task.assignee_agent || task.assignee_id || 'Unassigned'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Henry Audit Verdict */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Henry Audit Verdict</h3>
            <div className={`p-3 rounded-lg ${
              henryVerdict === 'approved' ? 'bg-[#16C784]/10 border border-[#16C784]/30' :
              henryVerdict === 'needs_work' ? 'bg-[#FF3B30]/10 border border-[#FF3B30]/30' :
              'bg-[#FFB020]/10 border border-[#FFB020]/30'
            }`}>
              <div className="flex items-center gap-2">
                {henryVerdict === 'approved' ? <CheckCircle2 className="w-5 h-5 text-[#16C784]" /> :
                 henryVerdict === 'needs_work' ? <AlertCircle className="w-5 h-5 text-[#FF3B30]" /> :
                 <Clock className="w-5 h-5 text-[#FFB020]" />}
                <span className={`text-sm font-semibold ${
                  henryVerdict === 'approved' ? 'text-[#16C784]' :
                  henryVerdict === 'needs_work' ? 'text-[#FF3B30]' :
                  'text-[#FFB020]'
                }`}>
                  {henryVerdict.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Closure Confidence */}
            <div className="mt-4">
              <p className="text-xs text-[#6B7280] mb-1">Closure Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#1F2226] rounded-full overflow-hidden">
                  <div className="h-full bg-[#16C784] rounded-full" style={{ width: `${closureConfidence}%` }} />
                </div>
                <span className="text-sm text-white font-medium">{closureConfidence}%</span>
              </div>
            </div>
            {/* Current Blocker */}
            {currentBlocker && (
              <div className="mt-4 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                  <span className="text-xs uppercase font-bold text-[#FF3B30]">Current Blocker</span>
                </div>
                <p className="text-sm text-[#FF3B30]/90">{currentBlocker}</p>
              </div>
            )}
          </div>

          {/* Evidence Bundle */}
          {evidence && (Array.isArray(evidence) ? evidence.length > 0 : Object.keys(evidence).length > 0) && (
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
              <h3 className="text-sm font-medium text-white mb-3">Evidence Bundle</h3>
              <div className="space-y-2">
                {Array.isArray(evidence) ? evidence.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-[#1F2226] rounded">
                    <FileText className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-sm text-[#9BA3AF]">{item}</span>
                  </div>
                )) : Object.entries(evidence).map(([key, value], idx) => (
                  <div key={idx} className="p-2 bg-[#1F2226] rounded">
                    <p className="text-xs text-[#6B7280]">{key}</p>
                    <p className="text-sm text-[#9BA3AF]">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Ownership</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Owner Agent</p>
                <p className="text-sm text-white">{mission.owner_agent || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Priority</p>
                <span className={`text-sm font-medium ${
                  mission.priority === 'critical' ? 'text-[#FF3B30]' :
                  mission.priority === 'high' ? 'text-[#FF6A00]' :
                  mission.priority === 'medium' ? 'text-[#3B82F6]' :
                  'text-[#6B7280]'
                }`}>
                  {mission.priority?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Category</p>
                <p className="text-sm text-white">{mission.category || 'Uncategorized'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Timeline</h3>
            <div className="space-y-3">
              {mission.target_start_date && (
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Target Start</p>
                  <p className="text-sm text-white">{new Date(mission.target_start_date).toLocaleDateString()}</p>
                </div>
              )}
              {mission.target_end_date && (
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Target End</p>
                  <p className="text-sm text-white">{new Date(mission.target_end_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Created</p>
                <p className="text-sm text-[#9BA3AF]">{new Date(mission.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
