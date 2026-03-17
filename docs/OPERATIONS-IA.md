# ATLAS Operations Lifecycle IA
## ATLAS-PRIME-OPERATIONS-IA-CLOSEOUT-1102

---

## Executive Summary

Restructure Operations to reflect the actual execution lifecycle: **Missions → Milestones → Tasks → Delegation → Productivity**

Each surface has a clear contract, data requirements, and visual standard.

---

## 1. NAVIGATION ORDER (Enforced)

```
Operations (parent overview)
├── Missions        ← Whole goals, owners, blockers, verdicts
├── Milestones      ← Deadline checkpoints, timeline, flags
├── Tasks           ← Child-task breakdown, dependencies, quality
├── Delegation      ← Workload, queue depth, assignments
└── Productivity    ← KPIs, throughput, metrics
```

---

## 2. /operations (Parent Overview)

**Purpose:** Executive dashboard showing the entire lifecycle at a glance

### Components (Overview Level Only)

| Component | Data | Action |
|-----------|------|--------|
| **Lifecycle Navigation** | 5 cards (Missions/Milestones/Tasks/Delegation/Productivity) | Click to drill down |
| **Mission Snapshot** | Top 3 active missions with blockers | Click → /operations/missions |
| **Milestone Timeline** | Next 3 upcoming checkpoints | Click → /operations/milestones |
| **Critical Tasks** | Top 5 blocked/at-risk tasks | Click → /operations/tasks |
| **Delegation Status** | Agent workload summary (overloaded/available) | Click → /operations/delegation |
| **Productivity Pulse** | 4 key KPIs (throughput, success rate, cycle time, reopen rate) | Click → /operations/productivity |

### Data Contract

```typescript
interface OperationsOverview {
  missions: {
    active: number;
    blocked: number;
    top3: MissionSummary[];
  };
  milestones: {
    upcoming: number;
    delayed: number;
    next3: MilestoneSummary[];
  };
  tasks: {
    total: number;
    blocked: number;
    atRisk: number;
    critical5: TaskSummary[];
  };
  delegation: {
    agents: number;
    overloaded: number;
    available: number;
    queueDepth: number;
  };
  productivity: {
    throughput: number;      // missions completed this week
    successRate: number;     // % missions closed without reopen
    avgCycleTime: number;    // days from accepted to closed
    reopenRate: number;      // % missions that reopened
  };
}
```

### Visual Contract
- Full-width (`p-6` no max-width)
- Knowledge pattern: gradient icon containers, stat cards
- Color coding: Red = blocked/at-risk, Yellow = warning, Green = on-track
- NO deep data tables (drill down to child pages)

---

## 3. /operations/missions

**Purpose:** Whole goal visibility with owner, phase, blocker, and verdict status

### Components (Already Implemented ✓)

| Component | Data | Purpose |
|-----------|------|---------|
| **Mission Cards** | Full mission list | Primary mission visibility |
| **Status Filter** | All mission statuses | Filter by status |
| **Phase Filter** | planning/execution/verification/closure | Filter by phase |
| **Owner Filter** | Dynamic agent list | Filter by owner |
| **Search** | ID, title | Find specific mission |
| **Blocker Alert** | Current blocker text | Surface blockers immediately |
| **Henry Verdict** | reviewing/approved/needs_work | Audit state visibility |
| **Closure Confidence** | Claimed vs Proven % | Truth about readiness |

### Data Contract

```typescript
interface Mission {
  id: string;
  title: string;
  objective: string;
  owner_agent: string;
  phase: 'planning' | 'execution' | 'verification' | 'closure';
  status: string;
  priority: string;
  percentComplete: number;      // Claimed progress
  closure_confidence: number;   // Proven progress
  current_blocker: string | null;
  henry_audit_verdict: 'pending' | 'approved' | 'needs_work';
  olivia_verification_state?: string;
  assigned_agents: string[];
  evidence_bundle: any[];
  success_criteria: any[];
  target_start_date?: string;
  target_end_date?: string;
  created_at: string;
  updated_at: string;
}
```

### Visual Contract
- Card grid: 3 columns on XL, 2 on LG, 1 on mobile
- Blocked missions: Red border-2 + red bg tint
- Blocker text: Red alert box on card surface
- Henry badge: Always visible, color-coded
- Claimed vs Proven: Dual progress bars with gap warning
- Sort: Blocked missions first, then by priority

---

## 4. /operations/milestones (TO BUILD)

**Purpose:** Deadline checkpoint visibility with timeline and delay flags

### Components

| Component | Data | Purpose |
|-----------|------|---------|
| **Milestone Timeline** | Chronological milestone list | Visual timeline view |
| **Mission Progress Bar** | % complete per mission | Context for milestones |
| **ETA Calculator** | Days to next checkpoint | Time awareness |
| **Status Flags** | delayed / on-track / ahead | At-a-glance health |
| **Owner Column** | Who owns each milestone | Accountability |
| **Dependencies** | Blocked by other milestones? | Risk visibility |

### Data Contract

```typescript
interface Milestone {
  id: string;
  mission_id: string;
  mission_title: string;
  title: string;
  description: string;
  checkpoint_date: string;      // Deadline
  eta_days: number;             // Calculated from today
  status: 'not_started' | 'in_progress' | 'completed' | 'missed';
  flag: 'delayed' | 'at_risk' | 'on_track' | 'ahead';
  owner_agent: string;
  percent_complete: number;
  blockers: string[];
  depends_on: string[];         // Other milestone IDs
  evidence_required: string[];
  evidence_provided: string[];
  created_at: string;
  updated_at: string;
}
```

### Visual Contract
- Timeline view: Vertical or horizontal timeline
- Color flags: 🔴 delayed / 🟡 at-risk / 🟢 on-track / 🔵 ahead
- Progress bars: Mission-level completion behind milestones
- Sort: Upcoming deadlines first, then delayed, then at-risk

---

## 5. /operations/tasks (TO BUILD)

**Purpose:** Child-task breakdown with dependencies, quality tracking, and execution status

### Components

| Component | Data | Purpose |
|-----------|------|---------|
| **Task Table/List** | All tasks with status | Task inventory |
| **Dependency Graph** | Visual dependency map | Understand blockers |
| **Owner Column** | Task-level ownership | Accountability |
| **Quality Badge** | Pass/fail/reopen history | Execution quality |
| **Evidence Status** | Evidence provided? | Verification readiness |
| **Execution Indicator** | Owner performing well? | Performance signal |
| **Mission Filter** | Filter by parent mission | Context switching |

### Data Contract

```typescript
interface Task {
  id: string;
  mission_id: string;
  mission_title: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'reopened';
  owner_agent: string;
  depends_on: string[];         // Task IDs
  blocking: string[];           // Tasks blocked by this
  quality_status: 'pass' | 'fail' | 'pending';
  reopen_count: number;
  evidence_required: string[];
  evidence_provided: string[];
  evidence_status: 'complete' | 'incomplete' | 'pending_review';
  execution_score: number;      // 0-100 calculated metric
  on_time: boolean;
}
```

### Visual Contract
- Table view: Compact, sortable columns
- Dependency graph: Visual DAG
- Quality badges: 🟢 pass / 🔴 fail / 🟡 pending / 🟠 reopened
- Evidence status: Checkbox style (checked = complete)
- Execution indicator: Dot + label (excellent/good/needs_improvement)

---

## 6. /operations/delegation (TO BUILD)

**Purpose:** Workload visibility, queue management, and automatic assignment

### Components

| Component | Data | Purpose |
|-----------|------|---------|
| **Agent Workload Cards** | Per-agent task load | Workload visibility |
| **Queue Depth Meter** | Pending task queue | Bottleneck detection |
| **Overload Alerts** | Agents over capacity | Intervention trigger |
| **Support Needed Flags** | Agents requesting help | Team coordination |
| **Assign Help Button** | Manual assignment trigger | Human override |
| **Auto-Assign Action** | Next available agent logic | Automation |
| **Health Check Trigger** | Severino intervention | Recovery support |

### Data Contract

```typescript
interface AgentWorkload {
  agent_id: string;
  agent_name: string;
  status: 'available' | 'busy' | 'overloaded' | 'offline';
  active_tasks: number;
  max_capacity: number;
  utilization_percent: number;
  queue_depth: number;
  support_needed: boolean;
  support_reason?: string;
  avg_completion_time: number;
  quality_score: number;
  on_time_rate: number;
}

interface DelegationQueue {
  total_pending: number;
  unassigned: TaskSummary[];
}
```

### Actions

| Action | Trigger | Result |
|--------|---------|--------|
| **Assign Help** | Click on overloaded agent | Opens assignment dialog |
| **Auto-Assign** | Click auto-assign button | Assigns to next available agent |
| **Health Check** | Assign support OR auto-detect overload | Triggers Severino health/recovery check |

---

## 7. /operations/productivity (TO BUILD)

**Purpose:** KPI layer with throughput, completion rates, and bottleneck metrics

### Components

| Component | Data | Purpose |
|-----------|------|---------|
| **Throughput Chart** | Missions completed over time | Velocity tracking |
| **Completion Rate Gauge** | % missions completed on time | Efficiency metric |
| **Reopen Rate Trend** | Reopened missions over time | Quality metric |
| **Verification Pass Rate** | Henry approval rate | Audit quality |
| **Cycle Time Distribution** | Days from accepted to closed | Speed metric |
| **Per-Agent Quality Table** | Agent performance metrics | Individual accountability |
| **Bottleneck Heatmap** | Where missions get stuck | Process improvement |

### Data Contract

```typescript
interface ProductivityMetrics {
  throughput: {
    weekly: number;
    trend: 'up' | 'down' | 'flat';
  };
  completion: {
    rate: number;
    onTimeRate: number;
    avgCycleTime: number;
  };
  quality: {
    reopenRate: number;
    verificationPassRate: number;
  };
  agentPerformance: {
    agent_id: string;
    agent_name: string;
    missions_completed: number;
    avg_cycle_time: number;
    reopen_rate: number;
    quality_score: number;
  }[];
  bottlenecks: {
    phase: string;
    status: string;
    count: number;
  }[];
}
```

---

## 8. IMPLEMENTATION PRIORITY

1. **P0 (DONE):** /operations/missions - Live data, operator-grade ✓
2. **P1:** /operations - Parent overview with lifecycle cards
3. **P2:** /operations/tasks - Task breakdown with dependencies
4. **P3:** /operations/delegation - Workload and assignment
5. **P4:** /operations/milestones - Timeline and checkpoints
6. **P5:** /operations/productivity - KPIs and metrics

---

## 9. VISUAL STANDARDS (All Pages)

- **Full-width:** `p-6` no max-width constraints
- **Knowledge Pattern:** Gradient icon containers, stat cards, rounded-[10px]
- **Color Palette:**
  - Red `#FF3B30` = blocked/error/at-risk
  - Yellow `#FFB020` = warning/pending
  - Green `#16C784` = success/on-track
  - Orange `#FF6A00` = primary actions
- **Typography:** text-white headers, text-[#9BA3AF] secondary
- **Cards:** bg-[#111214], border border-[#1F2226], hover:border-[#FF6A00]/50

---

⚡ Prime Technology