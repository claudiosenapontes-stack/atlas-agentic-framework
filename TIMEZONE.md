# TIMEZONE.md - Atlas Agent Timezone Configuration

## Standard
All Atlas systems operate using **America/New_York (ET)** as the primary timezone.

## Time Rules
| Context | Timezone | Format |
|---------|----------|--------|
| System time | America/New_York | - |
| Display time | America/New_York | "2026-03-13 14:15:03 ET" |
| Storage time | UTC | "2026-03-13T18:15:03Z" |
| UTC Offset | -5h (EST) / -4h (EDT) | Automatic DST |

## Agents Affected
- henry
- severino  
- optimus
- prime
- sophia
- olivia
- harvey
- einstein

## Services with TZ=America/New_York
- mission-control
- agent-runtime
- command-bus
- event-pipeline
- health-aggregator
- auto-scaler
- agent-spawner
- result-aggregator
- chat-bridge

## Cron Schedules (All America/New_York)
| Event | Cron | Time (ET) |
|-------|------|-----------|
| Daily briefing | 0 7 * * * | 07:00 ET |
| Morning check | 0 8 * * * | 08:00 ET |
| Afternoon check | 0 14 * * * | 14:00 ET |
| Evening wrap | 0 18 * * * | 18:00 ET |
| Weekly report | 0 20 * * 0 | 20:00 ET Sunday |
| Fleet heartbeat | */30 * * * * | Every 30 min |
| Health ping | 0 9 * * * | 09:00 ET |

## Logging Format
All logs include both timestamps:
```
UTC: 2026-03-13T18:15:03Z
NY:  2026-03-13 14:15:03 ET
```

## Calendar Default
- Olivia uses America/New_York for all calendar operations
- Meeting reminders default to ET
- Agenda briefings reference ET

Standardized: 2026-03-13 (ATLAS-TIMEZONE-STANDARDIZATION-501)
