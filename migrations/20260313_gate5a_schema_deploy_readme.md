# ATLAS-GATE5A-SCHEMA-DEPLOY-902

## Deployment Status

### CHANGED
- Created migration: `20260313_gate5a_durable_tables.sql` (3 new tables)
- Created migration: `20260313_gate5a_durable_columns.sql` (15 columns + indexes)

### Tables to Create
1. `execution_attempts` - Retry attempt tracking
2. `execution_events` - State change event log  
3. `heartbeat_events` - Worker heartbeat tracking

### Columns to Add to `executions`

#### Lease Management
- `lease_owner` (VARCHAR)
- `lease_expires_at` (TIMESTAMPTZ)
- `lease_attempt` (INTEGER)

#### Heartbeat
- `heartbeat_at` (TIMESTAMPTZ)
- `heartbeat_timeout_sec` (INTEGER)

#### Retry/Idempotency
- `attempt_number` (INTEGER)
- `retry_of_execution_id` (UUID, FK)
- `idempotency_key` (VARCHAR, UNIQUE)

#### Snapshots
- `input_snapshot` (JSONB)
- `output_snapshot` (JSONB)

#### Failure Analysis
- `failure_class` (VARCHAR)
- `failure_reason` (TEXT)

#### Progress
- `progress_pct` (INTEGER, 0-100)
- `state_changed_at` (TIMESTAMPTZ)

### Indexes to Create
1. `idx_executions_expired_leases` - Lease recovery queries
2. `idx_executions_workflow_active` - Active workflow executions
3. `idx_executions_retry_queue` - Failed/retrying ordered
4. `idx_executions_idempotency_key` - Unique idempotency
5. `idx_executions_lease_owner` - Worker claiming
6. `idx_executions_heartbeat` - Heartbeat monitoring
7. `idx_execution_attempts_execution_id` - Attempt lookup
8. `idx_execution_attempts_number` - Attempt ordering
9. `idx_execution_events_execution_id` - Event streaming
10. `idx_execution_events_type` - Event type queries
11. `idx_heartbeat_events_execution` - Heartbeat lookup
12. `idx_heartbeat_events_worker` - Worker health

### Triggers to Create
- `track_execution_state_change()` - Auto-log status changes

## Deployment Instructions

### Option 1: Supabase Dashboard
1. Go to: https://ukuicfswabcaioszcunb.supabase.co/project/_/sql
2. Copy contents of `20260313_gate5a_durable_tables.sql`
3. Run SQL
4. Copy contents of `20260313_gate5a_durable_columns.sql`
5. Run SQL

### Option 2: psql CLI
```bash
psql $SUPABASE_URL -f migrations/20260313_gate5a_durable_tables.sql
psql $SUPABASE_URL -f migrations/20260313_gate5a_durable_columns.sql
```

## Post-Deployment Verification

Run the following to verify:
```sql
-- Check tables
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('execution_attempts', 'execution_events', 'heartbeat_events');

-- Check columns
SELECT column_name FROM information_schema.columns WHERE table_name='executions' AND column_name IN ('lease_owner', 'lease_expires_at', 'heartbeat_at', 'idempotency_key');

-- Check indexes  
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_executions_%';
```

## Current Status

**SQL Files Created:** ✅ YES  
**Migrations Ready:** ✅ YES  
**Applied to DB:** ⏳ PENDING (requires manual execution via Supabase Dashboard)
