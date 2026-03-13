# Meetings & Calendar Integration API Design
# ATLAS-MEETINGS-INTEGRATION-356

## Overview
Backend API design for meeting management, calendar sync, and follow-up tracking in Atlas.

---

## Core Entities

### Meeting
Central calendar event with full context (attendees, links, notes, follow-ups).

### MeetingAttendee
RSVP tracking and attendance verification for each participant.

### MeetingTask
Junction table linking meetings to tasks (preparation, action items, follow-ups).

### CalendarSyncState
OAuth tokens and sync configuration per agent/calendar provider.

---

## API Endpoints

### Meetings

#### List Meetings
```
GET /api/meetings
?company_id=uuid&status=confirmed&requires_follow_up=true
```

#### Get Meeting Details
```
GET /api/meetings/:id?include=attendees,tasks
```

#### Create Meeting
```
POST /api/meetings
```
Request:
```json
{
  "title": "Q2 Planning",
  "start_time": "2026-04-01T10:00:00Z",
  "end_time": "2026-04-01T11:30:00Z",
  "company_id": "uuid",
  "meeting_type": "client",
  "attendees": [{ "agent_id": "uuid" }, { "email": "ext@corp.com" }],
  "create_meet_link": true
}
```

#### Update Meeting
```
PATCH /api/meetings/:id
```

#### Delete Meeting
```
DELETE /api/meetings/:id
```

---

### Calendar Sync

#### Get Sync Status
```
GET /api/meetings/sync-status?agent_id=uuid
```

#### Configure Sync
```
POST /api/meetings/sync-config
```
Request:
```json
{
  "agent_id": "uuid",
  "email": "einstein@atlas.ai",
  "provider": "google",
  "sync_enabled": true,
  "sync_direction": "bidirectional"
}
```

#### Trigger Manual Sync
```
POST /api/meetings/sync
{ "agent_id": "uuid", "full_sync": false }
```

---

### Follow-ups

#### Complete Follow-up
```
POST /api/meetings/:id/follow-up/complete
```

---

## Task Linkage Plan

### Link Types
| Type | Purpose | Example |
|------|---------|---------|
| `preparation` | Tasks to do before meeting | "Prepare slides" |
| `agenda_item` | Agenda as trackable task | "Discuss pricing" |
| `action_item` | Task from meeting | "Send proposal" |
| `follow_up` | Post-meeting follow-up | "Schedule next" |

### Automatic Task Creation Flow
1. Meeting scheduled → Create preparation tasks
2. Meeting completed → AI extracts action items
3. Action items → Create tasks (link_type='action_item')
4. Set follow-up date → Create follow-up task

---

## Implementation Notes

### Security
- OAuth tokens encrypted at rest
- Meeting visibility respected (private meetings only to attendees)
- Company isolation via company_id
- RLS policies for row-level security

### Performance
- Indexes on start_time, company_id, organizer_id
- Views for upcoming meetings, follow-ups, stats
- Async sync jobs to avoid blocking

### Compatibility
- Works with existing companies, contacts, agents tables
- Tasks table extended with meeting_id and meeting_context
- Olivia workflows can trigger on meeting lifecycle

---

## Schema Location
`supabase/migrations/20260313_meetings_integration.sql`
