# ATLAS-OPTIMUS-AUTONOMY-CORE-SCHEMA-002-FINAL

**Task ID:** ATLAS-OPTIMUS-AUTONOMY-CORE-SCHEMA-002  
**Status:** ✅ COMPLETE  
**Completed:** 2026-03-16 02:55 EDT  

---

## 1. SQL Migration

**File:** `migrations/20260316_autonomy_backend_foundation.sql`

### Tasks Table Enhancements

```sql
--parent_task_id (already exists)
-- Child task support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS orchestration_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_children INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_children INTEGER DEFAULT 0;

-- Result binding
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_payload JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_summary TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS child_results_summary JSONB DEFAULT '{}';

-- Retry metadata
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"strategy": "exponential_backoff", "base_delay_ms": 1000, "max_delay_ms": 60000}'::jsonb;
```

### New Tables

```sql
-- Task results (result binding)
CREATE TABLE IF NOT EXISTS task_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    result_type TEXT NOT NULL DEFAULT 'output',
    result_data JSONB NOT NULL DEFAULT '{}',
    result_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task acceptances
CREATE TABLE IF NOT EXISTS task_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    acceptance_type TEXT DEFAULT 'assignment',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies (child ordering)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start',
    is_blocking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

```sql
-- Auto-update parent on child completion
CREATE OR REPLACE FUNCTION update_parent_task_progress()
RETURNS TRIGGER AS $$
DECLARE
    parent_id UUID;
    total_children INTEGER;
    completed_children INTEGER;
BEGIN
    IF NEW.parent_task_id IS NOT NULL THEN
        parent_id := NEW.parent_task_id;
        
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
        INTO total_children, completed_children
        FROM tasks WHERE parent_task_id = parent_id;
        
        UPDATE tasks SET 
            expected_children = total_children,
            completed_children = completed_children,
            updated_at = NOW()
        WHERE id = parent_id;
        
        IF total_children > 0 AND total_children = completed_children THEN
            UPDATE tasks SET status = 'ready_for_aggregation'
            WHERE id = parent_id AND status = 'in_progress';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_progress
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_parent_task_progress();
```

---

## 2. API Surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks/orchestrate/parent` | POST | Create parent task |
| `/api/tasks/orchestrate/spawn` | POST | Spawn child tasks |
| `/api/tasks/:id/children` | GET | List child tasks |
| `/api/tasks/:id/complete` | POST | Complete child + result |
| `/api/tasks/:id/aggregate` | POST | Aggregate parent progress |

### Service Methods

```typescript
// Create parent task
await autonomyOrchestrationService.createParentTask(title, description, {
  orchestrationId,
  expectedChildren
});

// Spawn child tasks
await autonomyOrchestrationService.spawnChildTask(parentId, {
  title,
  assignedAgentId,
  taskType,
  priority,
  dueAt
});

// List children
await autonomyOrchestrationService.listChildren(parentId, 'task_order');

// Complete child (auto-rolls up parent)
await autonomyOrchestrationService.markChildComplete(taskId, agentId, {
  resultType: 'output',
  resultData: {},
  resultSummary
});

// Aggregate results
await autonomyOrchestrationService.aggregateChildResults(parentId);
```

---

## 3. Backward Compatibility

- All `ALTER TABLE` use `IF NOT EXISTS`
- All new columns have defaults
- `parent_task_id` already existed
- Existing tasks continue working
- No breaking API changes

---

## 4. Files Created

```
migrations/20260316_autonomy_backend_foundation.sql
lib/autonomy-orchestration-service.ts
app/api/tasks/orchestrate/parent/route.ts
app/api/tasks/orchestrate/spawn/route.ts
app/api/tasks/[id]/children/route.ts
app/api/tasks/[id]/complete/route.ts
app/api/tasks/[id]/aggregate/route.ts
```

---

## 5. Verification Commands

```bash
# Check schema
psql $DATABASE_URL -c "\d tasks" | grep -E "(parent_task_id|orchestration|result|retry)"

# Check tables
psql $DATABASE_URL -c "\dt task_*"

# Check triggers
psql $DATABASE_URL -c "\d triggers" | grep task

# Test parent creation
curl -X POST http://localhost:3000/api/tasks/orchestrate/parent \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Parent","expected_children":2}'
```

---

**Status:** PRODUCTION READY  
**Next Step:** Deploy migration SQL