# Atlas OS Control - Truth Model (v1.0)
## Backend Authoritative Data Model

---

## 1. FLEET_SUMMARY

### Source Tables/Services
| Component | Source | Query |
|-----------|--------|-------|
| Agent List | `worker_heartbeats` | `SELECT worker_id, worker_type, status, last_heartbeat_at` |
| Execution State | `executions` | `SELECT status, COUNT(*) GROUP BY status` |
| Lease Status | `executions` | `SELECT lease_owner, lease_expires_at WHERE lease_owner IS NOT NULL` |
| PM2 Runtime | `pm2 jlist` | Process status, uptime, restarts |
| Gateway Status | Internal healthcheck | `/health` endpoint |

### Refresh Frequency
- **Real-time**: Heartbeat updates (5s poll)
- **Active**: Every 30 seconds
- **Passive**: Every 5 minutes

### Critical Thresholds
| Metric | Warning | Critical | Emergency |
|--------|---------|----------|-----------|
| Offline Agents | >10% | >25% | >50% |
| Expired Leases | >5 | >20 | >100 |
| Stuck Executions | >30 min | >1 hour | >4 hours |
| PM2 Restarts | >5/hour | >20/hour | >50/hour |

### Escalation Rules
1. **Warning** → Auto-retry + log
2. **Critical** → Alert Henry + Slack #alerts
3. **Emergency** → Page Claudio + War Room protocol

---

## 2. AGENT_RUNTIME_STATUS

### Source Tables/Services
| Metric | Source | Field |
|--------|--------|-------|
| Agent State | `worker_heartbeats.status` | `active`/`stale`/`expired` |
| Last Activity | `worker_heartbeats.last_heartbeat_at` | ISO timestamp |
| Current Task | `worker_heartbeats.current_execution_id` | UUID reference |
| Session Health | `heartbeat_events` | Event log |
| Runtime Metrics | PM2 | Memory, CPU, uptime |

### Refresh Frequency
- **Active agents**: 5 seconds
- **Stale agents**: 30 seconds
- **Expired agents**: 60 seconds

### Critical Thresholds
| State | Threshold | Action |
|-------|-----------|--------|
| Stale | >60s since heartbeat | Mark stale, notify |
| Expired | >120s since heartbeat | Mark expired, trigger reassignment |
| Orphaned | `current_execution_id` NOT NULL + expired | Immediate orphan reassignment |
| Memory | >512MB | Alert + GC suggestion |
| CPU | >80% sustained | Throttle + investigate |

### Escalation Rules
1. **Stale** → Log + soft notification
2. **Expired** → Trigger G5B M3 recovery
3. **Orphaned execution** → Immediate reassignment + PM2 restart

---

## 3. SYSTEM_HEALTH_STATUS

### Source Tables/Services
| Component | Source | Health Check |
|-----------|--------|--------------|
| Database | Supabase REST | `SELECT 1` latency < 500ms |
| Mission Control | `http://localhost:3005/health` | HTTP 200 |
| Agent Runtime | `agent-runtime` PM2 process | Status = `online` |
| Command Bus | `command-bus` PM2 process | Status = `online` |
| Result Aggregator | `result-aggregator` PM2 process | Status = `online` |
| Self Healer | `agent-self-healer` PM2 process | Status = `online` |
| Event Pipeline | `event-pipeline` PM2 process | Status = `online` |
| Task Orchestrator | `mc-task-orchestrator` PM2 process | Status = `online` |
| Redis Queue | `mc-redis-queue-worker` PM2 process | Workers > 0 |
| G5B M3 Services | `g5b-*` PM2 processes | All 3 online |

### Refresh Frequency
- **Core services**: 15 seconds
- **Background services**: 60 seconds
- **Full system scan**: 5 minutes

### Critical Thresholds
| Metric | Degraded | Unhealthy | Critical |
|--------|----------|-----------|----------|
| Service Down | 1 non-critical | 1 critical | >2 critical |
| DB Latency | >500ms | >2s | >10s |
| DB Errors | <1% | 1-5% | >5% |
| PM2 Restarts | >5/hour | >20/hour | >50/hour |
| Memory Pressure | >70% | >85% | >95% |
| Disk Space | <20% | <10% | <5% |

### Escalation Rules
1. **Degraded** → Log + trend monitoring
2. **Unhealthy** → Alert + auto-restart attempt
3. **Critical** → War Room + manual intervention + notify Claudio

---

## 4. AUDIT_ACTIONS_AVAILABLE

### Source Tables/Services
| Audit Type | Source | Fields |
|------------|--------|--------|
| Schema Audit | `information_schema` | Table/column validation |
| Data Integrity | Custom validation queries | Foreign key checks |
| Performance Audit | `pg_stat_statements` | Slow query detection |
| Security Audit | `audit_logs` | Access patterns |
| Runtime Audit | PM2 logs | Error patterns |
| Compliance Audit | `executions` + `tasks` | SLA compliance |

### Refresh Frequency
- **Continuous**: Runtime errors logged immediately
- **Hourly**: Performance metrics
- **Daily**: Full compliance audit
- **On-demand**: Schema validation

### Critical Thresholds
| Audit Type | Warning | Failure |
|------------|---------|---------|
| Schema Drift | Column mismatch | Table missing |
| Data Integrity | <1% violations | >1% violations |
| Slow Queries | >1s execution | >5s execution |
| Security Events | Suspicious pattern | Breach indicator |
| SLA Breach | >5% late | >20% late |

### Escalation Rules
1. **Warning** → Log + schedule fix
2. **Failure** → Immediate alert + remediation task

---

## 5. INCIDENT_WARNING_FEED

### Source Tables/Services
| Feed Source | Table | Trigger |
|-------------|-------|---------|
| Critical Errors | `error_logs` | `severity = 'critical'` |
| System Events | `system_events_summary` | Any insert |
| Heartbeat Failures | `heartbeat_events` | `status != 'ok'` |
| Execution Failures | `execution_events` | `event_type LIKE '%failed%'` |
| Recovery Events | `recovery_events` | Any insert |
| Incidents | `incidents` | `status = 'open'` |
| PM2 Crashes | PM2 logs | Process exit code != 0 |
| Supabase Errors | API responses | HTTP >= 500 |

### Refresh Frequency
- **Real-time**: WebSocket push for critical events
- **Active poll**: 10 seconds for errors
- **Passive scan**: 60 seconds for trends

### Critical Thresholds
| Incident Type | Warning | Critical |
|---------------|---------|----------|
| Error Rate | >1/min | >10/min |
| Recovery Events | >5/hour | >20/hour |
| Open Incidents | >3 | >10 |
| Unacked Alerts | >5 | >20 |
| Cascade Failures | 2 services | 3+ services |

### Escalation Rules
1. **Warning** → Dashboard + Slack
2. **Critical** → SMS + War Room
3. **Cascade** → All channels + P0 protocol

---

## DEFINITIONS

### Stuck Agent
```
Definition: An agent that has not sent a heartbeat in >120 seconds
OR status = 'expired' OR worker_heartbeats.lease_expires_at < NOW()

Detection: SELECT * FROM worker_heartbeats 
WHERE status != 'active' 
OR last_heartbeat_at < NOW() - INTERVAL '120 seconds'

Action: Trigger orphan reassignment, emit recovery_event
```

### Stuck Task
```
Definition: An execution that has been in 'running' state for >30 minutes
OR has lease_expires_at in the past with status still 'running'

Detection: SELECT * FROM executions 
WHERE status = 'running' 
AND (started_at < NOW() - INTERVAL '30 minutes' 
     OR lease_expires_at < NOW())

Action: Mark failed, trigger retry, emit incident
```

### Degraded System
```
Definition: >=1 critical service showing elevated error rates
OR latency >500ms OR memory >85% OR non-critical service down

Detection: Health aggregator composite score < 70%

Action: Auto-restart, alert, trend monitoring
```

### Unhealthy Integration
```
Definition: External service (Supabase, Vercel, etc.) returning
HTTP >= 500 OR latency >2s OR connection errors >5%

Detection: Integration health check failures

Action: Circuit breaker, fallback mode, alert
```

### Audit Failure
```
Definition: Schema validation fails OR data integrity check fails
OR SLA breach detected OR security anomaly detected

Detection: Audit query returns violations

Action: Immediate alert, remediation task, escalation to owner
```

---

## DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    ATLAS OS CONTROL                         │
│                         (/control)                          │
├─────────────────────────────────────────────────────────────┤
│  fleet_summary          │  agent_runtime_status             │
│  ├── worker_heartbeats  │  ├── worker_heartbeats            │
│  ├── executions         │  ├── heartbeat_events             │
│  └── PM2 runtime        │  └── PM2 metrics                  │
├─────────────────────────────────────────────────────────────┤
│  system_health_status   │  audit_actions_available          │
│  ├── All PM2 services   │  ├── information_schema           │
│  ├── Supabase health    │  ├── audit_logs                   │
│  └── Resource metrics   │  └── pg_stat_statements           │
├─────────────────────────────────────────────────────────────┤
│              incident_warning_feed                          │
│  ├── error_logs (real-time)                                 │
│  ├── execution_events                                       │
│  ├── recovery_events                                        │
│  └── system_events_summary                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## STATUS

**control_truth_model_ready**: YES  
**sections_defined**: 5/5  
**source_map_ready**: YES  
**thresholds_defined**: YES  
**exact_blocker**: NONE

---

*Model Version: 1.0*  
*Author: Severino (System Administrator)*  
*Updated: 2026-03-14*
