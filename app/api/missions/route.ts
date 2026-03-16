/**
 * ATLAS-MISSIONS API
 * ATLAS-PRIME-MISSIONS-UI-WIRING-402
 * 
 * GET /api/missions
 * Fast response - demo data for mission board
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Demo missions showing full state progression
const demoMissions = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    id: "mission-004",
    title: "Fleet Health Monitoring",
    objective: "Implement real-time fleet health dashboard with alerting",
    owner: "Optimus",
    owner_agent: "Optimus",
    phase: "planning",
    status: "requested",
    priority: "high",
    percentComplete: 15,
    closure_confidence: 20,
    assignedAgents: ["Optimus", "Henry"],
    assigned_agents: ["Optimus", "Henry"],
    currentBlocker: "Waiting for PM2 metrics endpoint configuration",
    current_blocker: "Waiting for PM2 metrics endpoint configuration",
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
  },
  {
    id: "mission-005",
    title: "ATLAS Documentation Portal",
    objective: "Create comprehensive documentation portal for all realms",
    owner: "Harvey",
    owner_agent: "Harvey",
    phase: "executing",
    status: "executing",
    priority: "medium",
    percentComplete: 35,
    closure_confidence: 40,
    assignedAgents: ["Harvey", "Einstein"],
    assigned_agents: ["Harvey", "Einstein"],
    currentBlocker: "Need clarification on Operations vs Tactical boundaries",
    current_blocker: "Need clarification on Operations vs Tactical boundaries",
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
  },
  {
    id: "mission-006",
    title: "Agent Skill Registry",
    objective: "Build comprehensive skill registry for all ATLAS agents",
    owner: "Einstein",
    owner_agent: "Einstein",
    phase: "decomposed",
    status: "decomposed",
    priority: "low",
    percentComplete: 25,
    closure_confidence: 30,
    assignedAgents: ["Einstein"],
    assigned_agents: ["Einstein"],
    currentBlocker: null,
    current_blocker: null,
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
  },
  {
    id: "mission-007",
    title: "Control Center Audit",
    objective: "Complete security audit of Control Center infrastructure",
    owner: "Henry",
    owner_agent: "Henry",
    phase: "blocked",
    status: "blocked",
    priority: "critical",
    percentComplete: 50,
    closure_confidence: 60,
    assignedAgents: ["Henry", "Optimus"],
    assigned_agents: ["Henry", "Optimus"],
    currentBlocker: "Security scan tool license expired",
    current_blocker: "Security scan tool license expired",
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
  },
  {
    id: "mission-008",
    title: "Operations Missions UI",
    objective: "Deploy mission visibility surface for Henry and Olivia",
    owner: "Prime",
    owner_agent: "Prime",
    phase: "executing",
    status: "executing",
    priority: "high",
    percentComplete: 85,
    closure_confidence: 90,
    assignedAgents: ["Prime"],
    assigned_agents: ["Prime"],
    currentBlocker: null,
    current_blocker: null,
    henryAuditVerdict: "pending",
    henry_audit_verdict: "pending",
  },
];

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const ownerId = searchParams.get('owner_id');
    
    let missions = [...demoMissions];
    
    if (status && status !== 'all') {
      missions = missions.filter(m => m.status === status);
    }
    if (phase && phase !== 'all') {
      missions = missions.filter(m => m.phase === phase);
    }
    if (ownerId && ownerId !== 'all') {
      missions = missions.filter(m => m.owner_agent === ownerId || m.owner === ownerId);
    }
    
    return NextResponse.json({
      success: true,
      missions,
      count: missions.length,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      missions: [],
      count: 0,
      timestamp,
    }, { status: 500 });
  }
}
