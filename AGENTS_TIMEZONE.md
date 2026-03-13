# AGENTS.md - Atlas Agent Fleet Timezone Policy

## Timezone Standard
All Atlas agents operate using **America/New_York (ET)** as the primary timezone.

### Time Rules
| Context | Timezone | Format |
|---------|----------|--------|
| System time | America/New_York | - |
| Display time | America/New_York | "2026-03-13 14:15:03 ET" |
| Storage time | UTC | "2026-03-13T18:15:03Z" |
| UTC Offset | -5h (EST) / -4h (EDT) | Automatic DST |

### Agents Affected
- henry
- severino  
- optimus
- prime
- sophia
- olivia
- harvey
- einstein

### Scheduling Reference
| Event | Cron (ET) | Description |
|-------|-----------|-------------|
| Daily briefing | 0 7 * * * | 07:00 ET |
| Morning check | 0 8 * * * | 08:00 ET |
| Afternoon check | 0 14 * * * | 14:00 ET |
| Evening wrap | 0 18 * * * | 18:00 ET |
| Weekly report | 0 20 * * 0 | 20:00 ET Sunday |

### Implementation
- All logs include both UTC and ET timestamps
- All cron jobs execute in America/New_York timezone
- All meeting reminders default to ET
- Database remains UTC for storage consistency

Standardized: 2026-03-13 (ATLAS-TIMEZONE-STANDARDIZATION-501)
