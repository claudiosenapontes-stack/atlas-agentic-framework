'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Target, ArrowLeft, Users, CheckCircle2, Clock, AlertCircle,
  Flag, Shield, FileText, Rocket
} from 'lucide-react';

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
  childTasks: { id: string; title: string; status: string; assignee: string }[];
}

const demoMissions: Record<string, Mission> = {
  "mission-001": {
    id: "mission-001",
    title: "ATLAS Gate 4 Verification",
    objective: "Complete Gate 4 milestone verification with full evidence package",
    owner: "Henry",
    phase: "audit",
    status: "in_progress",
    realm: "Operations",
    percentComplete: 75,
    successCriteria: "All 5 audit points verified with documented evidence",
    assignedAgents: ["Henry", "Olivia"],
    evidenceReceived: ["Schema validation", "API contract tests", "Deployment logs"],
    henryAuditVerdict: "pending",
    currentBlocker: "Awaiting final deployment confirmation from Optimus",
    childTasks: [
      { id: "t1", title: "Verify schema migrations", status: "completed", assignee: "Olivia" },
      { id: "t2", title: "Run integration tests", status: "in_progress", assignee: "Henry" },
      { id: "t3", title: "Document findings", status: "pending", assignee: "Henry" },
    ],
  },
  "mission-002": {
    id: "mission-002",
    title: "EO Backend Stability",
    objective: "Resolve all Executive Ops backend timeouts and ensure 99% uptime",
    owner: "Olivia",
    phase: "stabilization",
    status: "in_progress",
    realm: "Executive Ops",
    percentComplete: 60,
    successCriteria: "All EO APIs respond < 2s, zero timeout errors for 24h",
    assignedAgents: ["Olivia", "Optimus"],
    evidenceReceived: ["Timeout logs analyzed", "DB connection pool optimized"],
    henryAuditVerdict: "needs_work",
    currentBlocker: "Supabase connection intermittent - needs retry logic",
    childTasks: [
      { id: "t1", title: "Add connection pooling", status: "completed", assignee: "Optimus" },
      { id: "t2", title: "Implement retry logic", status: "in_progress", assignee: "Olivia" },
      { id: "t3", title: "Add circuit breaker", status: "pending", assignee: "Optimus" },
    ],
  },
  "mission-003": {
    id: "mission-003",
    title: "Knowledge Realm Standardization",
    objective: "Standardize all realm visual patterns and full-width layouts",
    owner: "Prime",
    phase: "implementation",
    status: "completed",
    realm: "Knowledge",
    percentComplete: 100,
    successCriteria: "All 15+ pages use consistent Knowledge pattern",
    assignedAgents: ["Prime"],
    evidenceReceived: ["Visual audit complete", "All pages deployed", "Verification passed"],
    henryAuditVerdict: "approved",
    currentBlocker: null,
    childTasks: [
      { id: "t1", title: "Audit existing pages", status: "completed", assignee: "Prime" },
      { id: "t2", title: "Apply standardization", status: "completed", assignee: "Prime" },
      { id: "t3", title: "Deploy to production", status: "completed", assignee: "Prime" },
    ],
  },
};

const statusColors: Record<string, string> = {
  pending: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  in_progress: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  completed: 'bg-[#16C784]/10 text-[#16C784] border-[#16C784]/30',
};

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params.id as string;
  const mission = demoMissions[missionId];

  if (!mission) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-6">
        <Link href="/operations/missions" className="text-[#9BA3AF] hover:text-white">← Back</Link>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[#FF3B30]" />
          <h2 className="text-xl font-semibold text-white">Mission not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-6">
      <Link href="/operations/missions" className="text-[#9BA3AF] hover:text-white mb-6 inline-block">← Back to Missions</Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${statusColors[mission.status]}`}>{mission.status}</span>
            <h1 className="text-2xl font-semibold text-white mt-1">{mission.title}</h1>
          </div>
        </div>
        <p className="text-sm text-[#9BA3AF]">{mission.objective}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Success Criteria</h3>
            <p className="text-sm text-[#9BA3AF]">{mission.successCriteria}</p>
          </div>

          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Tasks</h3>
            <div className="space-y-2">
              {mission.childTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-[#1F2226] rounded-lg">
                  {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-[#16C784]" /> : <Clock className="w-4 h-4 text-[#3B82F6]" />}
                  <span className="text-sm text-white">{task.title}</span>
                  <span className="text-xs text-[#6B7280] ml-auto">{task.assignee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Team</h3>
            <p className="text-xs text-[#6B7280] mb-1">Owner</p>
            <p className="text-sm text-white mb-3">{mission.owner}</p>
            <p className="text-xs text-[#6B7280] mb-1">Assigned Agents</p>
            <div className="flex flex-wrap gap-2">
              {mission.assignedAgents.map((agent) => (
                <span key={agent} className="px-2 py-1 bg-[#1F2226] rounded text-xs text-[#9BA3AF]">{agent}</span>
              ))}
            </div>
          </div>

          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Henry's Verdict</h3>
            <span className={`text-sm font-medium ${
              mission.henryAuditVerdict === 'approved' ? 'text-[#16C784]' :
              mission.henryAuditVerdict === 'needs_work' ? 'text-[#FF3B30]' :
              'text-[#FFB020]'
            }`}>
              {mission.henryAuditVerdict.toUpperCase()}
            </span>
          </div>

          {mission.currentBlocker && (
            <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/30 rounded-[10px] p-5">
              <h3 className="text-sm font-medium text-[#FF3B30] mb-2">Current Blocker</h3>
              <p className="text-sm text-white/80">{mission.currentBlocker}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
