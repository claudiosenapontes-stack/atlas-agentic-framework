# OLIVIA DATABASE WRITE INTEGRATION
## ATLAS-PRIME-OLIVIA-WRITE-SYNC-9816

### Overview
Olivia must write all watchlist items, approvals, and follow-ups directly to the database via API calls. TOOLS.md and memory are NOT source of truth - the database is.

---

## 1. WATCHLIST

### When to Write
- Lead identified from email/WhatsApp
- Company added to tracking
- Opportunity flagged for follow-up
- Any item needs executive attention

### API Endpoint
```
POST https://atlas-agentic-framework.vercel.app/api/watchlist
Content-Type: application/json
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| title | string | Subject/description of item |
| category | string | One of: lead, company, contact, opportunity, task, event, other |
| priority | string | One of: low, medium, high, urgent |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| description | string | Additional details |
| entity_type | string | Type of entity (company, contact, etc) |
| entity_id | uuid | ID of related entity |
| reason | string | Why this was added |

### Example
```json
{
  "title": "TechCorp renewal discussion",
  "category": "opportunity",
  "priority": "high",
  "description": "$50K renewal at risk, need executive touch",
  "reason": "Email from CTO expressing concerns"
}
```

### Success Response
```json
{
  "success": true,
  "item": { ... },
  "id": "uuid",
  "status": "created"
}
```

---

## 2. APPROVALS (Reply Drafts)

### When to Write
- Reply drafted for executive review
- Multiple response options generated
- Recommended response needs approval
- Sensitive communication requiring sign-off

### API Endpoint
```
POST https://atlas-agentic-framework.vercel.app/api/approvals
Content-Type: application/json
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| title | string | Summary of what needs approval |
| type | string | Use "reply_draft" for email/WhatsApp replies |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| description | string | Full context + draft options |
| amount | number | If monetary value involved |
| requester_id | string | Who requested (agent ID) |

### Example
```json
{
  "title": "Reply to TechCorp CTO about renewal",
  "description": "Draft: 'Thanks for the feedback... [Option A recommended: Acknowledge concerns, schedule call, offer discount]. Option B: Standard response. Option C: Escalate to CEO.'",
  "requester_id": "olivia"
}
```

### Success Response
```json
{
  "success": true,
  "approval": { ... },
  "id": "uuid",
  "status": "created"
}
```

---

## 3. FOLLOW-UPS

### When to Write
- Task needs future action
- Deferred decision requires reminder
- Scheduled follow-up needed
- Promise made to contact

### API Endpoint
```
POST https://atlas-agentic-framework.vercel.app/api/followups
Content-Type: application/json
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| title | string | What needs to be followed up |
| priority | string | One of: low, medium, high |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| description | string | Context and details |
| due_date | ISO8601 | When follow-up is due |
| assignee | string | Who should handle this |

### Example
```json
{
  "title": "Check in with TechCorp on renewal decision",
  "description": "CTO said they need 1 week to discuss with board",
  "due_date": "2026-03-24T10:00:00Z",
  "priority": "high",
  "assignee": "claudio"
}
```

### Success Response
```json
{
  "success": true,
  "followup": { ... },
  "id": "uuid",
  "status": "created"
}
```

---

## 4. CRITICAL RULES

### ✅ DO
- Write to database IMMEDIATELY when item created
- Use descriptive titles
- Include context in description fields
- Set appropriate priority levels
- Verify success response (200/201)

### ❌ DON'T
- Store items only in TOOLS.md
- Store items only in memory
- Wait to batch writes
- Skip error handling

---

## 5. ERROR HANDLING

If API returns error:
1. Log the error
2. Retry once after 2 seconds
3. If still failing, escalate to system alert
4. NEVER silently drop the data

---

## 6. VERIFICATION

After writing, verify item appears in UI:
- Watchlist: `/executive-ops/watchlist`
- Approvals: `/executive-ops/approvals`
- Follow-ups: `/executive-ops/followups`

Items should appear instantly (no delay).

⚡ Prime — Technology
