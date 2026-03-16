# ATLAS-PHASE5-SCOPED-1268
## Owner-Useful Recommendation Categories

**Status:** READY  
**Scope:** Operator-focused recommendations for /events, /tasks, /hot-leads  

---

## RECOMMENDATION CATEGORIES

### 1. RETRY OPTIMIZATION
**What it fixes:** Tasks/workflows that repeatedly fail and retry
**Owner value:** Prevents stuck tasks, reduces manual intervention
**Relevant pages:** /tasks, /events

**Detection criteria:**
- 2+ executions with same failure signature in 24h
- Average retries > 2 OR any dead letter entries

**Example recommendation:**
```json
{
  "id": "rec-retry-abc123",
  "category": "retry_optimization",
  "priority": "high",
  "title": "Fix High Retry Rate: transient",
  "description": "15 task executions failing with avg 4.2 retries. 3 reached dead letter.",
  "context": {
    "affectedTasks": ["task-uuid-1", "task-uuid-2"],
    "occurrenceCount": 15,
    "timeframe": "24h"
  },
  "currentState": {
    "avgRetries": 4.2,
    "failureRate": "N/A"
  },
  "proposedChange": {
    "action": "increase_retry_attempts",
    "params": { "maxAttempts": 6 },
    "expectedImprovement": "Recover 3 stuck tasks"
  },
  "ownerImpact": {
    "timeSaved": "75 min/day",
    "tasksPrevented": 3,
    "confidence": 75
  },
  "relevantPages": ["/tasks", "/events"]
}
```

---

### 2. ROUTING OPTIMIZATION
**What it fixes:** Events/tasks getting default/generic routing instead of targeted assignment
**Owner value:** Reduces manual reassignment, faster task resolution
**Relevant pages:** /events, /tasks

**Detection criteria:**
- 5+ events with null routing or "general_task_default" reason in 24h
- Routing accuracy < 85%

**Example recommendation:**
```json
{
  "id": "rec-route-xyz789",
  "category": "routing_optimization",
  "priority": "medium",
  "title": "Improve Event-to-Agent Routing",
  "description": "12 events (20%) received default routing instead of targeted assignment.",
  "currentState": {
    "routingAccuracy": 80
  },
  "proposedChange": {
    "action": "update_routing_rules",
    "params": { "enableIntentClassification": true },
    "expectedImprovement": "Improve routing accuracy to 85%+"
  },
  "ownerImpact": {
    "timeSaved": "24 min/day",
    "tasksPrevented": 4,
    "confidence": 75
  },
  "relevantPages": ["/events", "/tasks"]
}
```

---

### 3. ESCALATION OPTIMIZATION
**What it fixes:** Hot leads not being escalated quickly enough
**Owner value:** Faster lead response, higher conversion
**Relevant pages:** /hot-leads, /events

**Detection criteria:**
- 3+ hot lead events in 24h
- Any hot lead workflow failures

**Example recommendation:**
```json
{
  "id": "rec-escalation-def456",
  "category": "escalation_optimization",
  "priority": "high",
  "title": "Optimize Hot Lead Response Time",
  "description": "8 hot leads detected in 24h. Ensure <2min response SLA.",
  "context": {
    "affectedWorkflows": ["hot-lead-capture"],
    "affectedLeads": ["lead-uuid-1", "lead-uuid-2"],
    "occurrenceCount": 8
  },
  "proposedChange": {
    "action": "enable_immediate_notification",
    "params": { "channels": ["telegram", "in_app"] },
    "expectedImprovement": "Reduce lead response time to <2min"
  },
  "ownerImpact": {
    "leadsRecovered": 2,
    "confidence": 85
  },
  "relevantPages": ["/hot-leads", "/events"]
}
```

---

### 4. TASK ASSIGNMENT OPTIMIZATION
**What it fixes:** Workload imbalance across agents
**Owner value:** Prevents bottlenecks, fairer distribution
**Relevant pages:** /tasks

**Detection criteria:**
- Agent task load variance > 50% (max vs average)
- 10+ tasks assigned in 7 days

**Example recommendation:**
```json
{
  "id": "rec-assign-ghi789",
  "category": "task_assignment_optimization",
  "priority": "medium",
  "title": "Rebalance Task Workload",
  "description": "3 agents have 2x+ average workload. Redistribute for efficiency.",
  "currentState": {
    "taskLoadVariance": 150
  },
  "proposedChange": {
    "action": "enable_load_balancing",
    "params": { "maxQueueSize": 15 },
    "expectedImprovement": "Balance task load across agents"
  },
  "ownerImpact": {
    "timeSaved": "45 min/day",
    "tasksPrevented": 8,
    "confidence": 80
  },
  "relevantPages": ["/tasks"]
}
```

---

## RANKING BY OPERATOR USEFULNESS

Recommendations are sorted by:
1. **Priority** (critical > high > medium > low)
2. **Owner Impact Confidence** (higher first)
3. **Time Saved** (more first)

---

## UI INTEGRATION

### Dashboard Widget
```
┌──────────────────────────────────┐
│  Smart Recommendations      [→]  │
├──────────────────────────────────┤
│  🔴 Fix High Retry Rate          │
│     Save 75 min/day           [Apply]
│  🟡 Improve Routing              │
│     Save 24 min/day           [Apply]
│  🟢 Optimize Hot Lead Response   │
│     Recover 2 leads/day       [Apply]
└──────────────────────────────────┘
```

### Contextual Recommendations
- On /tasks: Show retry_optimization + task_assignment
- On /events: Show routing_optimization + escalation_optimization
- On /hot-leads: Show escalation_optimization

---

## FIRST OPERATOR USEFUL OUTPUTS

### Sample API Response
```bash
GET /api/owner-recommendations?page=/tasks&refresh=true
```

```json
{
  "success": true,
  "recommendations": [
    {
      "id": "rec-retry-transient",
      "category": "retry_optimization",
      "priority": "high",
      "title": "Fix High Retry Rate: transient",
      "description": "3 executions failing with avg 6.0 retries. 1 reached dead letter.",
      "context": {
        "affectedTasks": ["f85d53fa-857c-4655-96fa-ae8f2b3df0c9"],
        "occurrenceCount": 3,
        "timeframe": "24h"
      },
      "currentState": { "avgRetries": 6.0, "failureRate": "N/A" },
      "proposedChange": {
        "action": "increase_retry_attempts",
        "params": { "maxAttempts": 7 },
        "expectedImprovement": "Recover 1 stuck task"
      },
      "ownerImpact": {
        "timeSaved": "15 min/day",
        "leadsRecovered": 0,
        "tasksPrevented": 1,
        "confidence": 65
      },
      "relevantPages": ["/tasks", "/events"],
      "status": "pending_review",
      "createdAt": "2026-03-15T02:55:00.000Z"
    }
  ],
  "source": "fresh",
  "count": 1,
  "timestamp": "2026-03-15T02:55:00.000Z"
}
```

---

## DATABASE SCHEMA

```sql
CREATE TABLE owner_recommendations (
    id TEXT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context JSONB NOT NULL,
    current_state JSONB NOT NULL,
    proposed_change JSONB NOT NULL,
    owner_impact JSONB NOT NULL,
    relevant_pages TEXT[] NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    applied_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_owner_recommendations_category ON owner_recommendations(category);
CREATE INDEX idx_owner_recommendations_priority ON owner_recommendations(priority);
CREATE INDEX idx_owner_recommendations_pages ON owner_recommendations USING GIN(relevant_pages);
```

---

**Einstein → Prime:**
This scoped implementation focuses on actionable owner value. Each recommendation ties directly to a pain point on /events, /tasks, or /hot-leads with clear impact metrics (time saved, leads recovered, tasks prevented). Ready for UI integration.
