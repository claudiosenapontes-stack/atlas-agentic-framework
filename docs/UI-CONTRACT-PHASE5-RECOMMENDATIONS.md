# ATLAS-PHASE5-UI-CONTRACT-1255
## Operator Recommendations UI Contract

**Status:** READY FOR IMPLEMENTATION  
**Owner:** Einstein (R&D) → Prime (UI)  
**Version:** 1.0.0

---

## 1. ENDPOINTS

### GET /api/operator/recommendations
Fetch pending/approved recommendations for operator review.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | "pending_review" | Filter: pending_review, approved, applied, rejected, all |
| priority | string | null | Filter: critical, high, medium, low |
| refresh | boolean | false | Force regeneration of recommendations |

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "rec-1234567890-unknown",
      "type": "retry_policy",
      "priority": "high",
      "title": "High Retry Rate: unknown",
      "description": "15 failures with avg 4.2 retries. 3 reached dead letter queue.",
      "pattern": {
        "signature": "unknown",
        "occurrences": 15,
        "timeframe": "24h",
        "affectedTasks": ["task-uuid-1", "task-uuid-2"]
      },
      "currentPolicy": {
        "maxAttempts": 3,
        "backoffStrategy": "exponential",
        "baseDelayMs": 1000
      },
      "proposedPolicy": {
        "maxAttempts": 5,
        "backoffStrategy": "exponential",
        "baseDelayMs": 2000,
        "jitter": true
      },
      "expectedImpact": {
        "reducedDeadLetterRate": "~30%",
        "estimatedSavings": "0.15 USD/day",
        "confidence": 75
      },
      "status": "pending_review",
      "createdAt": "2026-03-15T01:50:00.000Z",
      "reviewedAt": null,
      "reviewedBy": null,
      "appliedAt": null,
      "appliedBy": null
    }
  ],
  "source": "cache|fresh",
  "count": 1,
  "timestamp": "2026-03-15T01:50:00.000Z"
}
```

### POST /api/operator/recommendations
Apply, approve, or reject a recommendation.

**Body:**
```json
{
  "recommendationId": "rec-1234567890-unknown",
  "action": "apply|approve|reject",
  "reviewedBy": "claudio",
  "reason": "Confirmed pattern from log analysis"
}
```

**Success Response (apply):**
```json
{
  "success": true,
  "message": "Recommendation applied successfully",
  "recommendationId": "rec-1234567890-unknown",
  "policyId": "uuid-of-new-policy",
  "policy": {
    "maxAttempts": 5,
    "backoffStrategy": "exponential",
    "baseDelayMs": 2000,
    "jitter": true
  }
}
```

---

## 2. UI COMPONENTS REQUIRED

### 2.1 Recommendation Card
```tsx
interface RecommendationCardProps {
  recommendation: OperatorRecommendation;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
  onApprove: (id: string) => void;
}
```

**Display Elements:**
- **Header:** Priority badge (color-coded), Type icon, Title
- **Pattern Stats:** Occurrence count, timeframe, affected task count
- **Policy Diff:** Side-by-side current vs proposed (highlight changes)
- **Impact:** Estimated savings, confidence score (progress bar)
- **Actions:** Apply (primary), Approve (secondary), Reject (tertiary)

### 2.2 Recommendations List
```tsx
interface RecommendationsListProps {
  statusFilter: "pending_review" | "approved" | "applied" | "rejected" | "all";
  priorityFilter?: "critical" | "high" | "medium" | "low";
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}
```

### 2.3 Audit Log Viewer
```tsx
// GET /api/operator/recommendations/audit?recommendationId={id}
interface AuditLogEntry {
  id: string;
  action: "created" | "viewed" | "approved" | "applied" | "rejected";
  performedBy: string;
  performedByType: "user" | "system";
  previousStatus: string;
  newStatus: string;
  changeReason?: string;
  createdAt: string;
}
```

---

## 3. PAGE INTEGRATION

### 3.1 New Page: `/operator/recommendations`
**Route:** Add to main navigation under "Health" or as standalone

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Recommendations                              [Refresh] │
├─────────────────────────────────────────────────────────┤
│  [All] [Pending] [Approved] [Applied] [Rejected]        │
│  Priority: [All ▼]                                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ HIGH  High Retry Rate: unknown               │   │
│  │                                                 │   │
│  │ Pattern: 15 occurrences in 24h                 │   │
│  │                                                 │   │
│  │ Current Policy        →  Proposed Policy       │   │
│  │ • Max Attempts: 3     →  5                     │   │
│  │ • Base Delay: 1000ms  →  2000ms                │   │
│  │                                                 │   │
│  │ Expected Impact: ~30% dead letter reduction    │   │
│  │ Confidence: 75% [████████░░░░░░░░░░░░]         │   │
│  │                                                 │   │
│  │ [Apply] [Approve] [Reject] [View Details]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Dashboard Widget
**Location:** `/health` or `/control` page

**Compact View:**
- Badge showing count of pending recommendations
- Critical priority items highlighted
- Click to navigate to full recommendations page

---

## 4. STATE MANAGEMENT

### 4.1 Client-Side State
```tsx
interface RecommendationsState {
  items: OperatorRecommendation[];
  loading: boolean;
  error: string | null;
  lastRefreshed: Date;
  filters: {
    status: string;
    priority: string | null;
  };
}
```

### 4.2 Real-Time Updates (Optional)
```tsx
// WebSocket or polling for new recommendations
useEffect(() => {
  const interval = setInterval(() => {
    fetchRecommendations({ status: 'pending_review' });
  }, 30000); // 30 second polling
  return () => clearInterval(interval);
}, []);
```

---

## 5. ERROR HANDLING

### 5.1 API Errors
| Error | Message | Action |
|-------|---------|--------|
| 404 | "Recommendation not found" | Remove from list, refresh |
| 500 | "Failed to apply recommendation" | Show retry button |
| 400 | "Invalid action" | Log to error tracker |

### 5.2 UI States
- **Loading:** Skeleton cards with shimmer effect
- **Empty:** "No recommendations pending - system operating optimally"
- **Error:** Toast notification with retry action

---

## 6. ACCESS CONTROL

### 6.1 Permissions
| Action | Required Role |
|--------|--------------|
| View recommendations | operator, admin |
| Approve recommendation | operator, admin |
| Apply recommendation | admin |
| Reject recommendation | operator, admin |
| View audit log | admin |

---

## 7. IMPLEMENTATION CHECKLIST

- [ ] Create `/operator/recommendations` page
- [ ] Implement `RecommendationCard` component
- [ ] Implement `RecommendationsList` component
- [ ] Add API integration hooks (useRecommendations)
- [ ] Add navigation link
- [ ] Implement audit log viewer
- [ ] Add dashboard widget
- [ ] Add permission checks
- [ ] Write unit tests
- [ ] Update documentation

---

## 8. TESTING NOTES

### 8.1 Manual Test Cases
1. Load page → verify recommendations displayed
2. Click Apply → verify policy created, status updated
3. Click Reject → verify status changed, removed from pending
4. Click Refresh → verify new recommendations generated
5. Filter by priority → verify correct filtering

### 8.2 API Test Commands
```bash
# Get recommendations
curl "http://localhost:3005/api/operator/recommendations?status=pending_review"

# Apply recommendation
curl -X POST "http://localhost:3005/api/operator/recommendations" \
  -H "Content-Type: application/json" \
  -d '{"recommendationId":"rec-xxx","action":"apply","reviewedBy":"claudio"}'

# Reject recommendation
curl -X POST "http://localhost:3005/api/operator/recommendations" \
  -H "Content-Type: application/json" \
  -d '{"recommendationId":"rec-xxx","action":"reject","reviewedBy":"claudio","reason":"False positive"}'
```

---

## 9. HANDOFF NOTES

**Einstein → Prime:**
- Backend endpoints fully implemented and tested
- Database schema deployed (operator_recommendations, retry_policies, recommendation_audit_log)
- Pattern detection runs on-demand or every 6 hours (configurable via cron)
- All audit events automatically logged

**Open Questions:**
- Should we add email/Slack notifications for critical recommendations?
- Do we need a batch apply feature for multiple recommendations?
- Should rejected recommendations be permanently hidden or show in "rejected" tab?

**Next Phase Ideas:**
- Auto-apply recommendations with confidence > 90%
- Machine learning model for better pattern detection
- Integration with PagerDuty for critical alerts

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-15  
**Reviewed By:** Einstein
