# ATLAS-OPTIMUS-AUTONOMY-CORE-SCHEMA-002

**Task ID:** ATLAS-OPTIMUS-AUTONOMY-CORE-SCHEMA-002  
**Status:** ✅ COMPLETE  
**Completed:** 2026-03-16 02:45 EDT  
**Report:** ATLAS-OPTIMUS-AUTONOMY-CORE-SCHEMA-002-REPORT

---

## Executive Summary

Built the durable orchestration core schema enabling Henry to decompose work into parent/child hierarchies, track dependencies, bind results at task level, handle retries, and rollback when needed.

---

## 1. SQL Migration

**File:** `migrations/20260316_autonomy_backend_foundation.sql`

### Task Hierarchy Fields (Added to `tasks` table)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `parent_task_id` | UUID | existing | Parent task reference |
| `orchestration_id` | TEXT | null | Groups related tasks |
| `expected_children` | INTEGER | 0 | Expected child count |
| `completed_children` | INTEGER | 0 | Completed child count |
| `task_order` | INTEGER | existing | Child ordering within parent |

### Result Binding Fields (Added to `tasks` table)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `result_payload` | JSONB | `{}` | Structured result data |
| `result_summary` | TEXT | null | Human-readable summary |
| `child_results_summary` | JSONB | `{}` | Aggregated child results |

### Retry Metadata Fields (Added to `tasks` table)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `retry_count` | INTEGER | 0 | Current attempt number |
| `max_retries` | INTEGER | 3 | Max allowed retries |
| `last_retry_at` | TIMESTAMPTZ | null | Last retry timestamp |
| `retry_reason` | TEXT | null | Why task was retried |
| `retry_policy` | JSONB | see below | Retry configuration |

**Retry Policy Default:**
```json
{
  "strategy": "exponential_backoff",
  "base_delay_ms": 1000,
  "max_delay_ms": 60000
}
```

### Rollback-Ready Fields (V1 Lightweight)

| Field | Type | Purpose |
|-------|------|---------|
| `rollback_snapshot` | JSONB | Captured state for rollback |
| `rollback_available` | BOOLEAN | Rollback enabled flag |
| `rollback_expires_at` | TIMESTAMPTZ | 24h rollback window |
| `previous_status` | TEXT | Pre-rollback status |
| `previous_result_payload` | JSONB | Pre-rollback results |
| `previous_assigned_agent_id` | TEXT | Pre-rollback assignee |
| `checkpoint_count` | INTEGER | Number of checkpoints |

### New Tables

#### `task_dependencies`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- depends_on_task_id UUID REFERENCES tasks(id)
- dependency_type TEXT (finish_to_start, start_to_start, finish_to_finish, start_to_finish)
- is_blocking BOOLEAN DEFAULT TRUE
```

#### `task_checkpoints`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- checkpoint_number INTEGER
- status TEXT
- result_payload JSONB
- assigned_agent_id TEXT
- created_at TIMESTAMPTZ
```

#### `task_results`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- agent_id TEXT
- result_type TEXT (output, artifact, decision, error)
- result_data JSONB
- result_summary TEXT
- tokens_used INTEGER
- execution_time_ms INTEGER
```

#### `task_acceptances`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- agent_id TEXT
- accepted_at TIMESTAMPTZ
- acceptance_type TEXT
```

#### `task_state_transitions`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- previous_state TEXT
- new_state TEXT
- transitioned_by TEXT
- reason TEXT
```

#### `task_retry_log`
```sql
- id UUID PRIMARY KEY
- task_id UUID REFERENCES tasks(id)
- retry_number INTEGER
- previous_status TEXT
- new_status TEXT
- retry_reason TEXT
- error_message TEXT
```

---

## 2. Database Functions

### `update_parent_task_progress()`
- Trigger on task status change
- Counts children, updates parent
- Auto-transitions to `ready_for_aggregation`

### `log_task_state_transition()`
- Logs every status change
- Captures who/why/reason

### `retry_task(UUID, TEXT, TEXT)`
- Exponential/linear/fixed backoff
- Enforces max retries
- Resets assignment/acceptance

### `create_task_checkpoint(UUID)`
- Captures current state
- Increments checkpoint count
- Sets 24h rollback window

### `rollback_task(UUID, INTEGER, TEXT)`
- Restores to checkpoint
- Logs rollback action
- Preserves pre-rollback state

### `get_tasks_with_unmet_dependencies(UUID)`
- Returns blocked tasks
- Shows what's blocking them

---

## 3. Minimum API Surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/tasks/orchestrate/parent` | Create | Create parent task |
| `POST /api/tasks/orchestrate/spawn` | Create | Spawn child tasks |
| `GET /api/tasks/:id/children` | Read | List children with ordering |
| `POST /api/tasks/:id/complete` | Update | Mark complete + result |
| `POST /api/tasks/:id/accept` | Update | Accept assignment |
| `POST /api/tasks/:id/result` | Update | Submit result only |
| `POST /api/tasks/:id/aggregate` | Update | Roll up parent progress |
| `POST /api/tasks/:id/checkpoint` | Create | Create rollback point |
| `POST /api/tasks/:id/rollback` | Update | Rollback to checkpoint |
| `GET /api/tasks/:id/hierarchy` | Read | Full tree view |
| `GET /api/tasks/pending-acceptance` | Read | Pending for agent |
| `GET /api/orchestrations/:id/status` | Read | Status summary |

---

## 4. Henry's Decomposition Workflow

### Step 1: Create Parent
```bash
POST /api/tasks/orchestrate/parent
{
  "title": "Q1 Strategic Plan",
  "expected_children": 3
}
```

### Step 2: Spawn Children (with optional dependencies)
```bash
POST /api/tasks/orchestrate/spawn
{
  "parent_task_id": "uuid",
  "children": [
    {"title": "Finance", "assigned_agent_id": "harvey", "task_order": 1},
    {"title": "Research", "assigned_agent_id": "einstein", "task_order": 2}
  ]
}
```

### Step 3: List Children
```bash
GET /api/tasks/:parent_id/children?order_by=task_order
```

### Step 4: Mark Child Complete (auto-rolls up parent)
```bash
POST /api/tasks/:child_id/complete
{
  "agent_id": "harvey",
  "result_type": "output",
  "result_data": {"projections": [...]},
  "result_summary": "Q1 projections done"
}
```

### Step 5: Aggregate (when all children complete)
```bash
POST /api/tasks/:parent_id/aggregate
```

---

## 5. Rollback Capability

### Create Checkpoint
```bash
POST /api/tasks/:id/checkpoint
Response: { "checkpoint_number": 1, "rollback_available": true }
```

### Rollback
```bash
POST /api/tasks/:id/rollback
{
  "checkpoint_number": 1,  // optional, defaults to latest
  "reason": "Incorrect analysis"
}
```

**Constraints:**
- 24-hour rollback window
- Preserves full audit trail
- State transition logged

---

## 6. Backward Compatibility

All changes use `IF NOT EXISTS`:
- Existing tasks unaffected
- New columns have defaults
- Current write paths continue working
- No breaking API changes

---

## 7. Files Created

```
migrations/
└── 20260316_autonomy_backend_foundation.sql

lib/
└── autonomy-orchestration-service.ts

app/api/
├── tasks/
│   ├── orchestrate/
│   │   ├── parent/route.ts
│   │   └── spawn/route.ts
│   ├── [id]/
│   │   ├── accept/route.ts
│   │   ├── complete/route.ts
│   │   ├── result/route.ts
│   │   ├── aggregate/route.ts
│   │   ├── hierarchy/route.ts
│   │   ├── children/route.ts
│   │   ├── checkpoint/route.ts
│   │   └── rollback/route.ts
│   └── pending-acceptance/route.ts
└── orchestrations/
    └── [id]/
        └── status/route.ts
```

---

## 8. Migration Deployment

```bash
# Deploy to Supabase
psql $DATABASE_URL -f migrations/20260316_autonomy_backend_foundation.sql

# Or via SQL Editor
\i migrations/20260316_autonomy_backend_foundation.sql
```

---

## 9. Verification Checklist

- [x] `parent_task_id` exists (backward compatible)
- [x] Task ordering via `task_order`
- [x] Dependency tracking via `task_dependencies`
- [x] Result binding (`result_payload`, `result_summary`, `task_results`)
- [x] Retry metadata (`retry_count`, `last_retry_at`, `retry_reason`)
- [x] Rollback-ready fields (`rollback_snapshot`, `rollback_available`, checkpoints)
- [x] SQL migration with `IF NOT EXISTS`
- [x] Parent task creation API
- [x] Child task spawning API
- [x] List children API
- [x] Mark complete API (auto-rollup)
- [x] RLS policies on new tables
- [x] Indexes for performance

---

## 10. Service Methods

```typescript
// Core orchestration
await autonomyOrchestrationService.createParentTask(title, description, config)
await autonomyOrchestrationService.spawnChildTask(parentId, childConfig)
await autonomyOrchestrationService.listChildren(parentId, orderBy)
await autonomyOrchestrationService.markChildComplete(taskId, agentId, result)

// Results & aggregation
await autonomyOrchestrationService.submitTaskResult(taskId, agentId, result)
await autonomyOrchestrationService.aggregateChildResults(parentId)

// Rollback
await autonomyOrchestrationService.createCheckpoint(taskId)
await autonomyOrchestrationService.rollbackTask(taskId, checkpointNumber, reason)

// Dependencies
await autonomyOrchestrationService.addDependency(taskId, dependsOnId, type, blocking)
await autonomyOrchestrationService.getBlockedTasks(parentId)
```

---

**Prepared by:** Optimus (Productivity Lead)  
**Schema Status:** PRODUCTION-READY  
**Next Action:** Deploy migration, Henry can begin decomposition workflows