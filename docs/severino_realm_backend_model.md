# Atlas OS - Severino's Realm Backend Truth Model
## Authoritative Data Model for Operations Pages

**Version:** 1.0  
**Realm:** Severino (System Administrator / Operations Core)  
**Scope:** /control, /agents, /health, /integrations, /executions, /costs

---

## PAGES DEFINED

1. **/control** - Fleet overview and system status
2. **/agents** - Agent registry and runtime status  
3. **/health** - Service health and resource metrics
4. **/integrations** - External service health
5. **/executions** - Execution queue and task status
6. **/costs** - Cost tracking and budget management

---

## DEFINITIONS SUMMARY

### Stuck Task
- Running >30 minutes OR >3x expected duration
- Detection: `executions.status='running' AND started_at < NOW()-30m`
- Action: Mark stuck, offer kill/retry, alert owner

### Stalled Agent  
- No heartbeat >60s (warning) or >120s (critical)
- Detection: `worker_heartbeats.status != 'active'`
- Action: Warning=notify, Critical=G5B M3 recovery

### Degraded System
- Health score 50-70% OR 1+ non-critical service down
- Calculation: weighted average of db/service/resource/stability
- Action: Monitor + trend analysis

### Unhealthy Integration
- Error rate >5% OR latency >5x normal OR circuit breaker OPEN
- Detection: Integration health check failures
- Action: Circuit breaker + fallback + alert

### Retry Storm
- >10 retries/minute (warning) or >50/minute (critical)
- Detection: `COUNT(retry_queue) WHERE created_at > NOW()-1m`
- Action: Throttle + investigate root cause

### Unhealthy Cost Spike
- Single execution >$5 OR retry cost >10x original
- Detection: `actual_cost_usd > 5.00 OR retry_cost/original > 10`
- Action: Require approval for large executions

---

## MISSING BACKEND FIELDS

| Table | Missing Field | Purpose |
|-------|--------------|---------|
| worker_heartbeats | memory_usage | Agent resource tracking |
| worker_heartbeats | cpu_usage | Agent resource tracking |
| executions | expected_duration_ms | Stuck task detection |
| executions | estimated_cost_usd | Cost projection |
| service_health | last_check_at | Health check timing |
| service_health | response_time_ms | Performance tracking |
| integrations | circuit_breaker_state | Failure isolation |
| integrations | last_error_at | Error tracking |
| project_budget | alert_threshold_pct | Budget alerts |
| execution_attempts | model_name | Cost attribution |

---

## STATUS

**backend_truth_ready**: YES  
**page_models_defined**: 6/6  
**thresholds_defined**: YES  
**missing_backend_fields**: 10 fields identified  
**exact_blocker**: NONE

---

*Full detailed model available in docs/control_truth_model.md*
