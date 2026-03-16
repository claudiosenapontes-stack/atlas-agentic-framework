/**
 * ATLAS-MISSION-DETAIL API
 * ATLAS-PRIME-MISSIONS-UI-WIRING-402
 * 
 * GET /api/missions/[id]
 * Fast response - demo data
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const demoMissions: Record<string, any> = {
  "mission-001": {
    id: "mission-001",
    title: "ATLAS Gate 4 Verification",
    objective: "Complete Gate 4 milestone verification with full evidence package",
    owner: "Henry",
    owner_agent: "Henry",
    phase: "verifying",
    status: "verifying",
    priority: "high",
    percentComplete: 75,
    closure_confidence: 80,
    assignedAgents: ["Henry", "Olivia"],
    assigned_agents: ["Henry", "Olivia"],
    currentBlocker: null,
    current_blocker: null,
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
    success_criteria: "All 5 audit points verified with documented evidence",
    evidence_received: ["Schema validation", "API contract tests", "Deployment logs"],
    child_task_count: 3,
    completed_task_count: 2,
  },
  "mission-002": {
    id: "mission-002",
    title: "EO Backend Stability",
    objective: "Resolve all Executive Ops backend timeouts and ensure 99% uptime",
    owner: "Olivia",
    owner_agent: "Olivia",
    phase: "remediating",
    status: "remediating",
    priority: "critical",
    percentComplete: 60,
    closure_confidence: 45,
    assignedAgents: ["Olivia", "Optimus"],
    assigned_agents: ["Olivia", "Optimus"],
    currentBlocker: "Supabase connection intermittent - needs retry logic",
    current_blocker: "Supabase connection intermittent - needs retry logic",
    henryAuditVerdict: "needs_work",
    henry_audit_verdict: "needs_work",
    success_criteria: "All EO APIs respond < 2s, zero timeout errors for 24h",
    evidence_received: ["Timeout logs analyzed", "DB connection pool optimized"],
    child_task_count: 3,
    completed_task_count: 1,
  },
  "mission-003": {
    id: "mission-003",
    title: "Knowledge Realm Standardization",
    objective: "Standardize all realm visual patterns and full-width layouts",
    owner: "Prime",
    owner_agent: "Prime",
    phase: "closed",
    status: "closed",
    priority: "medium",
    percentComplete: 100,
    closure_confidence: 100,
    assignedAgents: ["Prime"],
    assigned_agents: ["Prime"],
    currentBlocker: null,
    current_blocker: null,
    henryAuditVerdict: "approved",
    henry_audit_verdict: "approved",
    success_criteria: "All 15+ pages use consistent Knowledge pattern",
    evidence_received: ["Visual audit complete", "All pages deployed", "Verification passed"],
    child_task_count: 3,
    completed_task_count: 3,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  
  try {
    const { id } = params;
    const mission = demoMissions[id];
    
    if (!mission) {
      return NextResponse.json({
        success: false,
        error: "Mission not found",
        timestamp,
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      mission,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    }, { status: 500 });
  }
}
