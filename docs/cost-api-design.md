# Cost Tracking API Design
# ATLAS-COST-DATA-MODEL-348

## Overview
This document defines the API endpoints for cost tracking and reporting in Atlas.

---

## Endpoints

### 1. Record Cost Entry

**POST** `/api/costs/record`

Record a granular cost entry for an operation.

#### Request Body
```json
{
  "task_id": "uuid",                    // Optional: Link to task
  "execution_id": "uuid",               // Optional: Link to execution
  "workflow_execution_id": "uuid",      // Optional: Link to workflow execution
  "agent_id": "uuid",                   // Required: Which agent incurred cost
  "company_id": "uuid",                 // Optional: Company context
  "cost_type": "llm_output",            // Required: Type of cost
  "model": "gpt-4",                     // Required: Model used
  "model_provider": "openai",           // Optional: Provider
  "tokens_input": 1000,                 // Optional: Input tokens
  "tokens_output": 500,                 // Optional: Output tokens
  "tokens_cached": 0,                   // Optional: Cached tokens
  "cost_usd": 0.04500,                  // Required: Calculated cost
  "price_per_1m_input": 30.00,          // Optional: Pricing metadata
  "price_per_1m_output": 60.00,         // Optional: Pricing metadata
  "execution_status": "success",        // Optional: success/failure/partial
  "retry_count": 0,                     // Optional: Which retry attempt
  "latency_ms": 1250,                   // Optional: Request latency
  "request_id": "req_abc123",           // Optional: External API request ID
  "metadata": {}                        // Optional: Additional context
}
```

#### Response
```json
{
  "success": true,
  "cost_entry_id": "uuid",
  "rollup_updated": {
    "execution_cost_usd": 0.04500,
    "agent_cost_usd": 125.50,
    "task_cost_usd": 0.04500
  }
}
```

#### Capture Points
- After each LLM API call in agent runtime
- After embedding generation
- After image generation
- When retry attempts fail (mark as retry_waste)
- When execution fails (mark as failed_waste)

---

### 2. Get Cost Summary

**GET** `/api/costs/summary`

Get aggregated cost data with flexible grouping.

#### Query Parameters
```
?company_id=uuid          // Filter by company
?agent_id=uuid            // Filter by agent
?workflow_id=uuid         // Filter by workflow
?task_id=uuid             // Filter by task
?start_date=2026-03-01    // Start date (ISO 8601)
?end_date=2026-03-13      // End date (ISO 8601)
?group_by=agent|model|day|task  // Grouping option
?cost_types=llm_input,llm_output  // Filter by cost types
```

#### Response
```json
{
  "success": true,
  "period": {
    "start": "2026-03-01T00:00:00Z",
    "end": "2026-03-13T23:59:59Z"
  },
  "summary": {
    "total_cost_usd": 1250.45,
    "total_tokens_input": 5000000,
    "total_tokens_output": 2500000,
    "total_entries": 450,
    "retry_waste_usd": 45.20,
    "failed_waste_usd": 12.50
  },
  "breakdown": [
    {
      "group_key": "einstein",
      "group_type": "agent",
      "cost_usd": 450.00,
      "tokens_input": 2000000,
      "tokens_output": 1000000,
      "call_count": 180
    }
  ]
}
```

---

### 3. Get Cost Timeline

**GET** `/api/costs/timeline`

Get time-series cost data for charts.

#### Query Parameters
```
?company_id=uuid          // Required: Company scope
?granularity=hour|day|week|month  // Time bucket size
?start_date=2026-03-01
?end_date=2026-03-13
?agent_id=uuid            // Optional: Filter by agent
```

#### Response
```json
{
  "success": true,
  "granularity": "day",
  "data": [
    {
      "timestamp": "2026-03-12T00:00:00Z",
      "cost_usd": 125.50,
      "tokens_input": 500000,
      "tokens_output": 250000,
      "waste_usd": 5.25,
      "active_agents": 3
    }
  ]
}
```

---

### 4. Get Agent Cost Report

**GET** `/api/costs/agents/:agent_id`

Get detailed cost report for a specific agent.

#### Query Parameters
```
?start_date=2026-03-01
?end_date=2026-03-13
```

#### Response
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "name": "einstein",
    "total_cost_usd": 450.00,
    "total_tokens_used": 3000000,
    "execution_count": 150
  },
  "model_usage": [
    {
      "model": "gpt-4",
      "call_count": 100,
      "total_tokens": 2000000,
      "cost_usd": 400.00,
      "avg_latency_ms": 1200
    },
    {
      "model": "gpt-3.5-turbo",
      "call_count": 50,
      "total_tokens": 1000000,
      "cost_usd": 50.00,
      "avg_latency_ms": 400
    }
  ],
  "waste_analysis": {
    "retry_waste_usd": 20.00,
    "failed_waste_usd": 5.00,
    "retry_rate": 0.05,
    "failure_rate": 0.02
  }
}
```

---

### 5. Get Workflow Cost Report

**GET** `/api/costs/workflows/:workflow_execution_id`

Get cost breakdown for a workflow execution.

#### Response
```json
{
  "success": true,
  "workflow_execution": {
    "id": "uuid",
    "workflow_name": "Data Analysis Pipeline",
    "status": "completed",
    "started_at": "2026-03-12T10:00:00Z",
    "completed_at": "2026-03-12T10:05:30Z",
    "duration_seconds": 330
  },
  "cost_summary": {
    "total_cost_usd": 5.25,
    "cost_per_step": 1.05,
    "retry_waste_usd": 0.50,
    "failed_waste_usd": 0
  },
  "step_breakdown": [
    {
      "step_name": "data_collection",
      "agent": "einstein",
      "model": "gpt-4",
      "cost_usd": 1.00,
      "tokens_input": 10000,
      "tokens_output": 5000,
      "latency_ms": 2000
    }
  ]
}
```

---

### 6. Manage Budgets (Gate 5A)

**POST** `/api/costs/budgets`

Create a cost budget.

#### Request Body
```json
{
  "company_id": "uuid",
  "agent_id": "uuid",              // Optional: Agent-specific budget
  "workflow_id": "uuid",           // Optional: Workflow-specific budget
  "budget_type": "monthly",        // daily|weekly|monthly|project
  "budget_usd": 1000.00,
  "alert_thresholds": [50, 80, 100]  // Percentage thresholds
}
```

**GET** `/api/costs/budgets`

List budgets with current spend.

**PATCH** `/api/costs/budgets/:id`

Update budget (increase limit, pause, etc.)

---

## Internal Integration Points

### Agent Runtime (Capture Point)

After each LLM call:

```typescript
// In agent runtime after LLM response
await recordCostEntry({
  agent_id: agentUuid,
  execution_id: currentExecutionId,
  cost_type: 'llm_output',
  model: response.model,
  tokens_input: response.usage.prompt_tokens,
  tokens_output: response.usage.completion_tokens,
  cost_usd: calculateCost(response.model, response.usage),
  execution_status: 'success',
  latency_ms: response.latency,
  request_id: response.id
});
```

### Retry Handler (Waste Tracking)

When a retry occurs:

```typescript
// Mark previous attempt cost as waste
await recordCostEntry({
  agent_id: agentUuid,
  execution_id: currentExecutionId,
  cost_type: 'retry_waste',
  model: previousModel,
  cost_usd: previousAttemptCost,
  retry_count: retryAttempt - 1,
  execution_status: 'failure'
});
```

### Execution Completion (Final Rollup)

When execution completes:

```typescript
// Any remaining waste is marked
if (executionFailed) {
  await recordCostEntry({
    agent_id: agentUuid,
    execution_id: currentExecutionId,
    cost_type: 'failed_waste',
    cost_usd: accumulatedCost,
    execution_status: 'failure'
  });
}
```

---

## Compatibility Notes

### Gate 1 (Task Visibility)
- Rollup columns added to `tasks` table: `total_cost_usd`, `execution_count`
- No breaking changes to existing APIs

### Gate 2 (Execution)
- `executions` table has `actual_cost_usd`, `tokens_used` columns
- Triggers auto-update these from `cost_entries`
- Backward compatible: existing code continues to work

### Gate 3 (Delegation)
- Cost entries can link to parent/child tasks via `task_id`
- Budgets can be set at agent level for delegated tasks

### Gate 4 (Workflows)
- `workflow_executions` has cost rollup columns
- Each workflow step creates cost entries linked to `workflow_execution_id`
- Budgets can be set per workflow

### Gate 5A (Durable Execution)
- `cost_entries` has `retry_count` for tracking retry waste
- `failed_waste` cost type tracks failed execution costs
- `latency_ms` helps identify slow/expensive operations
- Budget table supports alerting at thresholds

---

## Migration Path

1. **Apply Schema Migration**
   ```bash
   psql < 20260313_cost_data_model.sql
   ```

2. **Backfill Existing Data**
   ```sql
   -- Migrate existing execution costs to cost_entries
   INSERT INTO cost_entries (
     execution_id, agent_id, cost_type, model, 
     tokens_used as tokens_input, cost_usd, created_at
   )
   SELECT 
     id, agent_id, 'llm_output', model,
     tokens_used, actual_cost_usd, created_at
   FROM executions
   WHERE actual_cost_usd > 0;
   ```

3. **Update Agent Runtime**
   - Add cost recording after each LLM call
   - No changes needed to existing execution flow

4. **Enable Budget Alerts (Optional)**
   - Create budget records for companies/agents
   - Set up webhook notifications for threshold breaches
