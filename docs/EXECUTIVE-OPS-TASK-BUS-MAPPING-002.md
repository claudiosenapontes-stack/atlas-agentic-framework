# ATLAS-EINSTEIN-EXECUTIVE-OPS-TO-TASK-BUS-MAPPING-002
## Executive Ops → Task Bus Integration Mapping

**Status:** DEFINED  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  
**Scope:** Pre-implementation Task Bus contract

---

## EXECUTIVE SUMMARY

| Object | Bus-Producing | Publish Trigger | Downstream Consumer |
|--------|---------------|-----------------|---------------------|
| **event** | ✅ YES | On creation | All realms (broadcast) |
| **confirmation** | ✅ YES | On request | Specific agent(s) |
| **approval** | ✅ YES | On submit | Approver agents |
| **decision** | ✅ YES | On ratify | Decision stakeholders |
| **command** | ✅ YES | On issue | Target realm/agent |
| **delegated_action** | ✅ YES | On delegate | Delegate agent |
| meeting_record | ❌ NO | — | Realm-local only |
| meeting_decision | ❌ NO | — | Realm-local only |
| meeting_action_item | ❌ NO | — | Realm-local (promotable) |
| watch_rule | ❌ NO | — | Realm-local only |
| watch_alert | ❌ NO | — | Realm-local (may promote) |

**Bus Producers:** 6 objects  
**Realm-Local:** 5 objects (1 promotable)

---

## QUICK REFERENCE: LIFECYCLE → PUBLISH

| Object | State Change | Publish Action |
|--------|--------------|----------------|
| **event** | `draft` → `active` | Broadcast to all realms |
| **confirmation** | Created | Send to `required_from[]` |
| **approval** | `draft` → `requested` | Send to `approvers[]` |
| **decision** | `draft` → `proposed` | Send to `stakeholders[]` |
| **command** | `draft` → `issued` | Send to `target_realm` |
| **delegated_action** | `pending_acceptance` | Send to `delegate` |

---

## DETAILED MAPPING

### 1. EVENT → Task Bus

```typescript
// Publish Condition: status === "active"
// Consumer: Broadcast (all realms)
// Task Type: event_response

{
  task_type: "event_response",
  source_realm: "executive_ops",
  source_object_type: "event",
  source_object_id: UUID,
  event_type: "hot_lead" | "incident" | "milestone" | "alert" | "notification",
  severity: "critical" | "high" | "medium" | "low" | "info",
  title: string,
  description: string,
  requires_ack: boolean,
  deadline: Timestamp | null,
  assigned_to: null // Broadcast — first claim wins
}
```

**Consumer Response:**
- Claim → writes to `event.acknowledged_by[]`
- Resolve → writes to `event.status: "resolved"`

---

### 2. CONFIRMATION → Task Bus

```typescript
// Publish Condition: On creation
// Consumer: Specific agent(s)
// Task Type: confirmation_required

{
  task_type: "confirmation_required",
  source_realm: "executive_ops",
  source_object_type: "confirmation",
  source_object_id: UUID,
  confirmation_type: "acknowledgment" | "approval" | "receipt" | "verification",
  confirmed_object_type: string,
  confirmed_object_id: UUID,
  required_from: AgentID[],
  deadline: Timestamp | null,
  assigned_to: AgentID
}
```

**Consumer Response:**
- Confirm → writes to `confirmation.status: "confirmed"`
- Evidence → writes to `confirmation.evidence`

---

### 3. APPROVAL → Task Bus

```typescript
// Publish Condition: status === "requested"
// Consumer: Approver agents
// Task Type: approval_request

{
  task_type: "approval_request",
  source_realm: "executive_ops",
  source_object_type: "approval",
  source_object_id: UUID,
  approval_type: "expenditure" | "policy" | "access" | "action" | "exception",
  title: string,
  description: string,
  requested_by: AgentID,
  approvers: AgentID[],
  required_approvals: number,
  current_approvals: number,
  expires_at: Timestamp | null,
  assigned_to: AgentID
}
```

**Consumer Response:**
- Approve/Reject → appends to `approval.responses[]`
- Threshold met → `approval.status: "approved"`

---

### 4. DECISION → Task Bus

```typescript
// Publish Condition: status === "proposed"
// Consumer: Decision stakeholders
// Task Type: decision_review

{
  task_type: "decision_review",
  source_realm: "executive_ops",
  source_object_type: "decision",
  source_object_id: UUID,
  decision_type: "go_no_go" | "resource_allocation" | "policy_change" | "escalation" | "strategic",
  decision_scope: "local" | "cross_realm" | "fleet_wide",
  title: string,
  context: string,
  options: DecisionOption[],
  decider: AgentID,
  stakeholders: AgentID[],
  due_date: Timestamp | null,
  assigned_to: AgentID
}
```

**Consumer Response:**
- Review input → writes to `decision.selected_option`
- Finalize → triggers downstream commands

---

### 5. COMMAND → Task Bus

```typescript
// Publish Condition: status === "issued"
// Consumer: Target realm/agent
// Task Type: executive_command

{
  task_type: "executive_command",
  source_realm: "executive_ops",
  source_object_type: "command",
  source_object_id: UUID,
  command_type: "deploy" | "rollback" | "scale" | "restart" | "reconfigure" | "investigate" | "custom",
  target_realm: RealmID,
  target_agent: AgentID | null,
  title: string,
  description: string,
  parameters: Record<string, any>,
  deadline: Timestamp | null,
  required_confirmations: string[],
  assigned_to: AgentID | null
}
```

**Consumer Response:**
- Acknowledge → `command.status: "acknowledged"`
- Execute → `command.execution_id` + `command.status`
- Complete → `command.result`

---

### 6. DELEGATED_ACTION → Task Bus

```typescript
// Publish Condition: status === "pending_acceptance"
// Consumer: Delegate agent
// Task Type: delegated_assignment

{
  task_type: "delegated_assignment",
  source_realm: "executive_ops",
  source_object_type: "delegated_action",
  source_object_id: UUID,
  delegator: AgentID,
  delegate: AgentID,
  action_type: "task_assignment" | "investigation" | "coordination" | "escalation" | "custom",
  original_scope: string,
  delegated_scope: string,
  constraints: DelegationConstraint[],
  authority_level: "full" | "limited" | "reporting_only",
  due_date: Timestamp | null,
  assigned_to: AgentID
}
```

**Consumer Response:**
- Accept → `status: "accepted"`
- Progress → appends to `progress_updates[]`
- Complete → `status: "completed"`

---

## REALM-LOCAL OBJECTS (No Direct Task Bus)

| Object | Purpose | Integration Path |
|--------|---------|------------------|
| **meeting_record** | Deliberation capture | Queryable API only |
| **meeting_decision** | Meeting outcomes | Promote to `decision` |
| **meeting_action_item** | Internal follow-ups | Promote to `delegated_action` |
| **watch_rule** | Monitoring config | Produces `watch_alert` |
| **watch_alert** | Rule alerts | Promote to `event` |

---

## CONSUMER PATTERNS

| Object | Consumer | Claim Pattern | Callback Updates |
|--------|----------|---------------|------------------|
| **event** | Broadcast | First claim | `acknowledged_by[]`, `status` |
| **confirmation** | Specific | Assigned agent | `status`, `evidence` |
| **approval** | Specific | Approver claims | `responses[]`, `current_approvals` |
| **decision** | Specific | Stakeholder claims | `selected_option`, `status` |
| **command** | Targeted | Target claims | `status`, `execution_id`, `result` |
| **delegated_action** | Specific | Delegate claims | `status`, `progress_updates[]` |

---

## API CONTRACT

### Executive Ops → Task Bus
```
POST /api/task-bus/publish
{
  task_type: string,
  source_realm: "executive_ops",
  source_object_id: UUID,
  source_object_type: string,
  title: string,
  description: string,
  priority: "critical" | "high" | "medium" | "low",
  deadline: Timestamp | null,
  assigned_to: AgentID | null,
  // type-specific fields
}
```

### Task Bus → Executive Ops
```
POST /api/executive-ops/callbacks/task-claimed
{ task_id, source_object_id, claimed_by, claimed_at }

POST /api/executive-ops/callbacks/task-completed
{ task_id, source_object_id, result, completed_at }
```

---

**Report:** `docs/EXECUTIVE-OPS-TASK-BUS-MAPPING-002.md`

🎯 Einstein