# ATLAS-EINSTEIN-SCHEMA-CORRECTION-004
## Production Schema Telemetry Correction

**Status:** CORRECTED  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  

---

## CONFIRMED PRODUCTION SCHEMA

### executions table (ACTUAL fields observed)
| Field | Status | Notes |
|-------|--------|-------|
| `id` | ✅ EXISTS | UUID |
| `agent_id` | ⚠️ EXISTS but NULL | Unreliable for runtime identity |
| `task_id` | ✅ EXISTS | UUID |
| `status` | ✅ EXISTS | running, completed, failed, dead_letter |
| `tokens_used` | ✅ EXISTS | Always 0 in observations |
| `actual_cost_usd` | ✅ EXISTS | Always 0 in observations |
| `heartbeat_at` | ✅ EXISTS | Last heartbeat timestamp |
| `heartbeat_timeout_sec` | ✅ EXISTS | Timeout config (90s observed) |
| `heartbeat_count` | ✅ EXISTS | Number of heartbeats |
| `started_at` | ✅ EXISTS | Execution start |
| `completed_at` | ✅ EXISTS | Execution end |
| `failure_class` | ✅ EXISTS | transient, permanent |
| `error_message` | ✅ EXISTS | Error details |

### tasks table (ACTUAL fields observed)
| Field | Status | Notes |
|-------|--------|-------|
| `id` | ✅ EXISTS | UUID |
| `assigned_agent_id` | ✅ EXISTS | Agent UUID or name (e.g., "henry", "5e19d798...") |
| `execution_id` | ⚠️ EXISTS but NULL | Only populated after claim |
| `status` | ✅ EXISTS | inbox, assigned, in_progress, completed |
| `title` | ✅ EXISTS | Task name |
| `description` | ✅ EXISTS | Task details |
| `created_at` | ✅ EXISTS | Creation timestamp |

---

## SCHEMA_CORRECTION_REPORT

| Metric Family | Existing Production Source | Missing | Must Add Now | Can Defer |
|--------------|---------------------------|---------|--------------|-----------|
| **Agent Runtime Identity** | `tasks.assigned_agent_id` (string) | No canonical agent registry table | ✅ `agent_states` table (minimal) | Full agent metadata registry |
| **Heartbeat Truth** | `executions.heartbeat_at` + `heartbeat_count` | No millisecond-precision heartbeat log | ✅ `agent_heartbeats` table with sequence numbers | Heartbeat resource metrics (CPU/memory) |
| **Token Usage Capture** | `executions.tokens_used` (always 0) | OpenRouter response capture | ✅ Add `input_tokens`, `output_tokens`, `model` columns to executions | Per-agent token aggregation table |
| **Cost Attribution** | `executions.actual_cost_usd` (always 0) | Cost calculation from tokens | ✅ `execution_costs` table with calculated costs | Daily cost materialized views |
| **Live Fleet State** | DERIVED from `tasks.assigned_agent_id` + `executions.status` | No canonical agent state table | ✅ `agent_states` with state enum | Agent capability registry |
| **Integration Health** | None | No health monitoring table | ✅ `integration_health` table (minimal) | Detailed component metrics |
| **Incident Truth** | None | No stuck execution tracking | ✅ `execution_incidents` table | Incident auto-resolution logic |
| **Button State Model** | None | No UI action state tracking | ✅ `ui_action_states` table | Complex state machines |

---

## REVISED P0 MINIMUM SCHEMA

### 1. agent_states (MUST ADD NOW - 15 min)
```sql
-- Minimal version for closeout
CREATE TABLE agent_states (
    agent_id TEXT PRIMARY KEY,
    state TEXT CHECK (state IN ('online', 'offline', 'busy', 'idle', 'stuck')),
    current_execution_id UUID,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Purpose:** Canonical source for agent liveness (replaces unreliable executions.agent_id)

### 2. agent_heartbeats (MUST ADD NOW - 15 min)
```sql
-- Minimal version for closeout
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    execution_id UUID,
    heartbeat_sequence INTEGER NOT NULL,
    heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_heartbeats_agent ON agent_heartbeats(agent_id);
CREATE INDEX idx_heartbeats_time ON agent_heartbeats(heartbeat_at DESC);
```
**Purpose:** Millisecond-precision heartbeat log for stuck detection

### 3. execution_costs (MUST ADD NOW - 30 min)
```sql
-- Minimal version for closeout
CREATE TABLE execution_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id),
    agent_id TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_cost_usd DECIMAL(12,8),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_costs_execution ON execution_costs(execution_id);
CREATE INDEX idx_costs_agent ON execution_costs(agent_id);
```
**Purpose:** Real cost attribution (requires token capture first)

### 4. integration_health (MUST ADD NOW - 15 min)
```sql
-- Minimal version for closeout
CREATE TABLE integration_health (
    component TEXT PRIMARY KEY CHECK (component IN ('supabase', 'openrouter', 'telegram')),
    status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);
```
**Purpose:** Truth source for external dependency health

### 5. execution_incidents (MUST ADD NOW - 20 min)
```sql
-- Minimal version for closeout
CREATE TABLE execution_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id),
    incident_type TEXT CHECK (incident_type IN ('stuck', 'timeout')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_action TEXT
);
CREATE INDEX idx_incidents_execution ON execution_incidents(execution_id);
CREATE INDEX idx_incidents_active ON execution_incidents(resolved_at) WHERE resolved_at IS NULL;
```
**Purpose:** Incident audit trail for stuck executions

### 6. ui_action_states (MUST ADD NOW - 15 min)
```sql
-- Minimal version for closeout
CREATE TABLE ui_action_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id TEXT NOT NULL,
    action_type TEXT CHECK (action_type IN ('retry', 'reassign', 'kill')),
    execution_id UUID,
    state TEXT CHECK (state IN ('pending', 'in_progress', 'completed', 'failed')),
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ui_action_execution ON ui_action_states(execution_id);
CREATE INDEX idx_ui_action_state ON ui_action_states(state);
```
**Purpose:** Button click state machine with idempotency

---

## REVISED EXECUTIONS TABLE COLUMNS

### MUST ADD NOW (Optimus - 30 min)
```sql
ALTER TABLE executions 
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS model TEXT;
```
**Purpose:** Enable cost calculation from OpenRouter responses

---

## IMPLEMENTATION PRIORITY (Revised)

| Order | Task | Owner | Time | Blockers |
|-------|------|-------|------|----------|
| 1 | Add columns to executions | Optimus | 30 min | None |
| 2 | Create agent_states table | Severino | 15 min | None |
| 3 | Create agent_heartbeats table | Severino | 15 min | None |
| 4 | Create integration_health table | Severino | 15 min | None |
| 5 | Create execution_incidents table | Severino | 20 min | None |
| 6 | Create ui_action_states table | Optimus | 15 min | None |
| 7 | Create execution_costs table | Optimus | 30 min | #1 complete |
| 8 | Update OpenRouter wrapper to capture tokens | Optimus | 1 hr | #1 complete |

**Total Time:** ~3 hours (parallel work: 1.5 hours)

---

## WHAT WAS CORRECTED

| Original Assumption | Production Reality | Correction |
|--------------------|--------------------|------------|
| worker_heartbeats table exists | Only executions.heartbeat_at exists | Must ADD agent_heartbeats table |
| token_usage table exists | executions.tokens_used exists but always 0 | Must ADD columns to executions + capture logic |
| agent_id is reliable | executions.agent_id is mostly NULL | Must ADD agent_states as canonical source |
| Full schema needed | Minimal schema sufficient for closeout | Reduced 10 tables to 6 minimal tables |

---

## NO AMBIGUITY REMAINS

✅ **Exactly 6 tables must be created now**  
✅ **Exactly 3 columns must be added to executions**  
✅ **Exactly 2 owners assigned** (Optimus + Severino)  
✅ **Exactly 3 hours of work** (1.5h parallel)  
✅ **All other tables deferred to post-closeout**

---

**Einstein Sign-off:** Schema corrected to match production reality. Scope reduced to closeout minimum. 🎯
