# ATLAS-EINSTEIN-OBSERVABILITY-GAP-001
## Severino Realm Telemetry Truth Gap Analysis

**Status:** COMPLETE  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  

---

## EXECUTIVE SUMMARY

This report identifies every missing telemetry layer preventing Severino Realm from being fully truthful. Current telemetry captures execution-level metrics but lacks granular context, cost attribution, and runtime state visibility required for operational certainty.

---

## OBSERVABILITY GAP REPORT

| Metric Family | Current State | Missing Telemetry | Proposed Source | Priority |
|--------------|---------------|-------------------|-----------------|----------|
| **AGENT CONTEXT** | UNAVAILABLE | Per-agent session usage, token context windows, conversation history depth | `agent_sessions` table + `context_snapshots` | P0 |
| **COST ATTRIBUTION** | PARTIAL | Per-agent spend, per-workflow cumulative costs, projected monthly burn | `cost_allocations` table with agent_id FK | P0 |
| **STUCK DETECTION** | DERIVED | True stuck status (heartbeat timeout vs actually processing) | `stuck_detector` service + `agent_timeouts` table | P1 |
| **INTEGRATION STATUS** | UNAVAILABLE | External system health (Supabase real-time, PM2 process state, OpenRouter quota) | `integration_health` table + heartbeat probes | P1 |
| **HEARTBEAT TRUTH** | ESTIMATED | Actual last-agent-ping vs lease epoch | `agent_heartbeats` table with millisecond precision | P1 |
| **TASK STATE** | LIVE | Queue depth per agent, delegation chain visibility | `task_queue_metrics` materialized view | P2 |
| **WORKFLOW PROGRESS** | DERIVED | Step-level execution tracking, workflow DAG state | `workflow_executions` table enhancement | P2 |
| **ROUTING ACCURACY** | ESTIMATED | Event-to-agent match confidence, misrouting detection | `routing_decisions` table with confidence scores | P2 |
| **NOTIFICATION DELIVERY** | UNAVAILABLE | Hot-lead notification confirmation, channel health | `notification_log` table with delivery receipts | P3 |
| **COST PROJECTIONS** | UNAVAILABLE | Daily/weekly spend forecasting, budget alerts | `cost_projections` computed table | P3 |

---

## 1. CONTEXT TELEMETRY

### Current Gap
**No per-agent context/session usage visibility.**

Executions table has `tokens_used` and `actual_cost_usd` but lacks:
- Session ID tracking
- Context window utilization (tokens/128K limit)
- Conversation history depth
- Model context truncation events

### Required Telemetry

```sql
-- New table: agent_sessions
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    session_key TEXT NOT NULL,
    context_tokens INTEGER,
    context_window_size INTEGER DEFAULT 128000,
    truncation_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    compaction_events JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table: context_snapshots
CREATE TABLE context_snapshots (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES agent_sessions(id),
    snapshot_at TIMESTAMP WITH TIME ZONE,
    token_count INTEGER,
    system_prompt_tokens INTEGER,
    user_message_tokens INTEGER,
    assistant_message_tokens INTEGER,
    tool_result_tokens INTEGER,
    metadata JSONB
);
```

### Truth Classification
| Metric | Classification | Reason |
|--------|---------------|--------|
| context_tokens | LIVE | Direct from OpenRouter response headers |
| truncation_count | DERIVED | Calculated from context overflow events |
| message_count | LIVE | Direct count from session store |

---

## 2. COST TELEMETRY

### Current Gap
**Execution-level costs exist but lack aggregation dimensions.**

Current `executions.actual_cost_usd` is per-execution but missing:
- Per-agent cumulative spend
- Per-workflow cumulative costs
- Per-company allocation
- Real-time budget tracking

### Required Telemetry

```sql
-- Enhanced cost tracking
CREATE TABLE cost_allocations (
    id UUID PRIMARY KEY,
    execution_id UUID REFERENCES executions(id),
    agent_id TEXT,
    workflow_id TEXT,
    company_id UUID,
    task_id UUID,
    provider TEXT NOT NULL, -- 'openrouter', 'anthropic', 'openai'
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    input_cost_usd DECIMAL(10,6),
    output_cost_usd DECIMAL(10,6),
    total_cost_usd DECIMAL(10,6),
    billed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materialized view for real-time aggregations
CREATE MATERIALIZED VIEW cost_aggregations AS
SELECT 
    agent_id,
    DATE_TRUNC('day', created_at) as day,
    SUM(total_cost_usd) as daily_spend,
    SUM(input_tokens + output_tokens) as daily_tokens,
    COUNT(*) as execution_count
FROM cost_allocations
GROUP BY agent_id, DATE_TRUNC('day', created_at);
```

### Truth Classification
| Metric | Classification | Reason |
|--------|---------------|--------|
| actual_cost_usd | LIVE | From provider API response |
| daily_spend | DERIVED | Aggregated from LIVE data |
| projected_monthly | ESTIMATED | Extrapolated from trend |

---

## 3. RUNTIME TRUTH MODEL

### Canonical Sources Definition

| State | Current Source | Truth Level | Proposed Source |
|-------|---------------|-------------|-----------------|
| **agent_state** | executions.status | DERIVED | `agent_states` table with explicit online/offline/busy |
| **task_state** | tasks.status | LIVE | Already canonical |
| **heartbeat** | executions.heartbeat_at | ESTIMATED | `agent_heartbeats` table with millisecond precision |
| **execution_state** | executions.status | LIVE | Already canonical |
| **stuck_status** | executions.status = 'running' + timeout | DERIVED | `stuck_detector` service with explicit stuck flag |
| **integration_status** | health check endpoint | DERIVED | `integration_health` per-component status |

### Required Tables

```sql
-- New table: agent_states
CREATE TABLE agent_states (
    agent_id TEXT PRIMARY KEY,
    state TEXT CHECK (state IN ('online', 'offline', 'busy', 'idle', 'error')),
    current_task_id UUID,
    current_execution_id UUID,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    last_state_change_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table: agent_heartbeats
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    execution_id UUID,
    heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL,
    heartbeat_sequence INTEGER,
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    context_tokens INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table: stuck_detector
CREATE TABLE stuck_executions (
    id UUID PRIMARY KEY,
    execution_id UUID REFERENCES executions(id),
    detected_at TIMESTAMP WITH TIME ZONE,
    detection_reason TEXT CHECK (detection_reason IN ('heartbeat_timeout', 'no_progress', 'resource_exhaustion')),
    auto_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table: integration_health
CREATE TABLE integration_health (
    id UUID PRIMARY KEY,
    component TEXT NOT NULL, -- 'supabase', 'pm2', 'openrouter', 'telegram'
    status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    last_check_at TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. TRUTH CLASSIFICATION STANDARD

Every visible metric must be tagged with one of:

| Classification | Definition | Display Indicator | Example |
|---------------|------------|-------------------|---------|
| **LIVE** | Real-time data from authoritative source | 🟢 Green dot | execution.status, agent_heartbeats |
| **DERIVED** | Computed from LIVE data | 🟡 Yellow dot | stuck status from heartbeat timeout |
| **ESTIMATED** | Extrapolated/projections | 🟠 Orange dot | monthly cost projections |
| **UNAVAILABLE** | No data source exists | ⚪ Gray dash | agent context window usage |

### UI Implementation
```typescript
interface MetricWithTruth {
  value: any;
  classification: 'LIVE' | 'DERIVED' | 'ESTIMATED' | 'UNAVAILABLE';
  source: string;
  freshness_ms: number;
  confidence?: number; // 0-100 for ESTIMATED
}
```

---

## 5. MISSING TABLES / EVENTS / APIS

### Required New Tables

| Table | Purpose | Priority |
|-------|---------|----------|
| `agent_sessions` | Per-agent session context tracking | P0 |
| `context_snapshots` | Context window utilization over time | P0 |
| `cost_allocations` | Granular cost attribution | P0 |
| `cost_aggregations` | Materialized view for dashboards | P0 |
| `agent_states` | Canonical agent state source | P1 |
| `agent_heartbeats` | Millisecond-precision heartbeat log | P1 |
| `stuck_executions` | Detected and resolved stuck tasks | P1 |
| `integration_health` | External system health status | P1 |
| `notification_log` | Delivery confirmation tracking | P3 |
| `routing_decisions` | Event routing audit trail | P2 |

### Required New Events

| Event | Source | Payload | Priority |
|-------|--------|---------|----------|
| `agent.context.truncated` | OpenRouter wrapper | {agent_id, session_id, tokens_before, tokens_after} | P0 |
| `agent.heartbeat` | Agent execution | {agent_id, execution_id, timestamp, resources} | P1 |
| `cost.allocation.created` | Billing service | {execution_id, agent_id, cost_breakdown} | P0 |
| `integration.health.changed` | Health monitor | {component, old_status, new_status, reason} | P1 |
| `execution.stuck.detected` | Stuck detector | {execution_id, detection_reason, timestamp} | P1 |
| `execution.stuck.resolved` | Stuck detector | {execution_id, resolution_action, timestamp} | P1 |
| `notification.delivered` | Notification service | {lead_id, channel, delivery_status} | P3 |
| `notification.failed` | Notification service | {lead_id, channel, error, retry_count} | P3 |

### Required New APIs

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/telemetry/agent-context/:agentId` | Real-time context window usage | P0 |
| `GET /api/telemetry/costs/by-agent` | Per-agent spend breakdown | P0 |
| `GET /api/telemetry/costs/projections` | Monthly spend forecasting | P3 |
| `GET /api/telemetry/stuck` | Currently stuck executions | P1 |
| `GET /api/telemetry/health/integrations` | Integration health dashboard | P1 |
| `GET /api/telemetry/agent-state/:agentId` | Canonical agent state | P1 |
| `GET /api/telemetry/routing/accuracy` | Routing decision quality | P2 |
| `GET /api/telemetry/notifications/delivery` | Notification delivery stats | P3 |

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Core Truth (Week 1)
- [ ] Create `agent_sessions` and `context_snapshots` tables
- [ ] Create `cost_allocations` table
- [ ] Update OpenRouter wrapper to emit `agent.context.truncated` events
- [ ] Build `GET /api/telemetry/agent-context/:agentId`

### Phase 2: Runtime Truth (Week 2)
- [ ] Create `agent_states` and `agent_heartbeats` tables
- [ ] Create `stuck_executions` table
- [ ] Build stuck detector service
- [ ] Build `GET /api/telemetry/stuck`

### Phase 3: Integration Truth (Week 3)
- [ ] Create `integration_health` table
- [ ] Build health probe service
- [ ] Build `GET /api/telemetry/health/integrations`

### Phase 4: Operational Truth (Week 4)
- [ ] Create `routing_decisions` table
- [ ] Create `notification_log` table
- [ ] Build cost projection service
- [ ] Build `GET /api/telemetry/costs/projections`

---

## 7. SUCCESS CRITERIA MET

✅ **All remaining truth gaps explicitly identified**  
- 10 metric families analyzed
- 10 missing tables specified
- 8 new events defined
- 8 new APIs specified

✅ **No ambiguous telemetry remains**  
- Truth classification standard defined (LIVE/DERIVED/ESTIMATED/UNAVAILABLE)
- Every metric assigned classification
- UI indicator specification provided

✅ **Per-agent context tracking specified**  
- `agent_sessions` table schema
- `context_snapshots` for window utilization
- Truncation event tracking

✅ **Cost telemetry gaps closed**  
- `cost_allocations` for granular attribution
- `cost_aggregations` materialized view
- Projection service specification

✅ **Runtime truth model defined**  
- Canonical sources table for 6 state types
- Required tables specified with schemas
- Stuck detection service architecture

---

**Einstein Sign-off:** All observability gaps identified. Ready for implementation planning. 🪐
