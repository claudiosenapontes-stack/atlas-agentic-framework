# ATLAS-EINSTEIN-P0-TELEMETRY-IMPLEMENTATION-002
## P0 Telemetry Implementation Plan — Severino Closeout

**Status:** READY FOR ASSIGNMENT  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  

---

## P0_TELEMETRY_IMPLEMENTATION_PLAN

| Item | Needed For Closeout | Exact Source | Exact Table/API | Owner | ETA |
|------|---------------------|--------------|-----------------|-------|-----|
| **1. Agent Heartbeats** | Live fleet state detection, stuck execution identification | Agent execution loop emits heartbeat every 30s | Table: `agent_heartbeats`<br>API: `POST /api/telemetry/heartbeat`<br>API: `GET /api/telemetry/fleet/state` | **Severino** | 2 days |
| **2. Live Fleet State** | Canonical source for agent online/offline/busy status | Derived from heartbeats + current execution | Table: `agent_states`<br>API: `GET /api/fleet/agents`<br>API: `GET /api/fleet/agents/:id/state` | **Severino** | 2 days |
| **3. Token Usage Capture** | Cost attribution, context window monitoring | OpenRouter response headers (`x-ratelimit-remaining-tokens`, `x-ratelimit-remaining-requests`) | Table: `execution_tokens`<br>Field: `executions.input_tokens`<br>Field: `executions.output_tokens` | **Optimus** | 1 day |
| **4. Cost Attribution** | Per-agent spend tracking, budget enforcement | OpenRouter usage endpoint + token rates | Table: `execution_costs`<br>API: `GET /api/costs/by-agent`<br>API: `GET /api/costs/by-execution` | **Optimus** | 2 days |
| **5. Integration Truth Source** | Health of external dependencies (Supabase, PM2, OpenRouter, Telegram) | Health probe service polls each component every 60s | Table: `integration_health`<br>API: `GET /api/health/integrations`<br>API: `GET /api/health/:component` | **Severino** | 1 day |
| **6. Incident Truth Source** | Stuck execution detection and resolution audit | Stuck detector service monitors heartbeats | Table: `execution_incidents`<br>API: `GET /api/incidents/active`<br>API: `POST /api/incidents/:id/resolve` | **Severino** | 2 days |
| **7. Button Truth/State Model** | UI action state (pending/executed/failed), idempotency | Client action requests + server state machine | Table: `ui_action_states`<br>API: `POST /api/actions/:actionId/attempt`<br>API: `GET /api/actions/:actionId/state` | **Optimus** | 1 day |

---

## CRITICAL CLOSEOUT DEPENDENCIES

**Must be implemented IN ORDER:**

1. **Token Usage Capture** → Required for Cost Attribution (dependency)
2. **Agent Heartbeats** → Required for Fleet State and Incident detection (dependency)
3. **Fleet State** → Required for routing decisions (dependency)
4. **Integration Health** → Required for system reliability monitoring (dependency)
5. **Incident Tracking** → Required for operational visibility (dependency)
6. **Cost Attribution** → Required for budget controls (dependency)
7. **Button State Model** → Required for UI reliability (independent)

---

## TABLE SCHEMAS (SQL)

### 1. agent_heartbeats
```sql
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    execution_id UUID,
    heartbeat_sequence INTEGER NOT NULL,
    heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    context_tokens INTEGER,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_agent_heartbeats_agent_id ON agent_heartbeats(agent_id);
CREATE INDEX idx_agent_heartbeats_heartbeat_at ON agent_heartbeats(heartbeat_at DESC);
```

### 2. agent_states
```sql
CREATE TABLE agent_states (
    agent_id TEXT PRIMARY KEY,
    state TEXT CHECK (state IN ('online', 'offline', 'busy', 'idle', 'stuck', 'error')),
    current_execution_id UUID,
    current_task_id UUID,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    last_state_change_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    capabilities JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_agent_states_state ON agent_states(state);
```

### 3. execution_costs
```sql
CREATE TABLE execution_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id),
    agent_id TEXT NOT NULL,
    company_id UUID,
    workflow_id TEXT,
    task_id UUID,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    input_cost_usd DECIMAL(12,8) NOT NULL,
    output_cost_usd DECIMAL(12,8) NOT NULL,
    total_cost_usd DECIMAL(12,8) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_execution_costs_execution ON execution_costs(execution_id);
CREATE INDEX idx_execution_costs_agent ON execution_costs(agent_id);
CREATE INDEX idx_execution_costs_created ON execution_costs(created_at DESC);
```

### 4. integration_health
```sql
CREATE TABLE integration_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component TEXT NOT NULL CHECK (component IN ('supabase', 'supabase_realtime', 'pm2', 'openrouter', 'telegram', 'whatsapp')),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_integration_health_component ON integration_health(component);
```

### 5. execution_incidents
```sql
CREATE TABLE execution_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id),
    incident_type TEXT NOT NULL CHECK (incident_type IN ('stuck', 'failed', 'timeout', 'resource_exhaustion')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detected_by TEXT NOT NULL,
    description TEXT,
    auto_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,
    resolution_action TEXT,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_execution_incidents_execution ON execution_incidents(execution_id);
CREATE INDEX idx_execution_incidents_active ON execution_incidents(resolved_at) WHERE resolved_at IS NULL;
```

### 6. ui_action_states
```sql
CREATE TABLE ui_action_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('retry', 'reassign', 'kill', 'approve', 'reject')),
    execution_id UUID,
    user_id TEXT,
    state TEXT NOT NULL CHECK (state IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ui_action_states_execution ON ui_action_states(execution_id);
CREATE INDEX idx_ui_action_states_state ON ui_action_states(state);
CREATE UNIQUE INDEX idx_ui_action_states_idempotency ON ui_action_states(idempotency_key);
```

---

## API ENDPOINTS

### Severino APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telemetry/heartbeat` | POST | Agent heartbeat emission |
| `/api/telemetry/fleet/state` | GET | Fleet-wide agent states |
| `/api/fleet/agents` | GET | List all agents with state |
| `/api/fleet/agents/:id/state` | GET | Single agent state |
| `/api/health/integrations` | GET | All integration health |
| `/api/health/:component` | GET | Single component health |
| `/api/incidents/active` | GET | Currently active incidents |
| `/api/incidents/:id/resolve` | POST | Resolve an incident |

### Optimus APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/costs/by-agent` | GET | Cost aggregation by agent |
| `/api/costs/by-execution` | GET | Cost details per execution |
| `/api/actions/:actionId/attempt` | POST | Initiate UI action |
| `/api/actions/:actionId/state` | GET | Check action state |

---

## SUCCESS CRITERIA

✅ **No ambiguity remains about what must be implemented right now**

- 7 P0 items defined with exact scope
- No nice-to-haves included
- Dependencies explicitly mapped
- SQL schemas provided
- API contracts specified
- Owner assignments clear
- ETAs realistic (7 days total, parallel work)

---

## CLOSEOUT BLOCKERS REMOVED

| Gap | Resolution |
|-----|------------|
| Agent liveness unknown | `agent_heartbeats` + `agent_states` tables |
| Fleet state ambiguous | Canonical `agent_states` table with state machine |
| Token usage missing | Add columns to `executions` table |
| Cost tracking manual | `execution_costs` table with auto-calculation |
| Integration health unknown | `integration_health` table with probe service |
| Stuck executions hidden | `execution_incidents` table with detector |
| Button state unreliable | `ui_action_states` with idempotency |

---

**Einstein Sign-off:** P0 scope locked. No scope creep. Ready for Optimus + Severino sprint planning. 🎯
