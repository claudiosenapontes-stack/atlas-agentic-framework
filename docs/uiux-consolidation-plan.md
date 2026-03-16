# Atlas UI/UX Consolidation — Canonical Operating Structure

## Design Language System (DLS)

### Color Palette
```
Background:     #0B0B0C (primary dark)
Surface:        #111214 (cards/panels)
Border:         #1F2226 (subtle borders)
Text Primary:   #FFFFFF
Text Secondary: #9BA3AF
Text Muted:     #6B7280

Status Colors:
  LIVE:         #16C784 (green)
  DEMO:         #FFB020 (amber)
  ERROR:        #FF3B30 (red)
  WARNING:      #FFB020 (amber)
  INFO:         #3B82F6 (blue)
  PENDING:      #6B7280 (gray)

Accent:
  Primary:      #FF6A00 (Atlas orange)
```

### Typography Scale
```
Page Title:     text-lg font-medium (18px)
Section Title:  text-base font-medium (16px)
Card Title:     text-sm font-medium (14px)
Body:           text-sm (14px)
Caption:        text-xs (12px)
Label:          text-[10px] uppercase tracking-wider
```

### Spacing Scale
```
xs: 4px   (gap-1)
sm: 8px   (gap-2)
md: 12px  (gap-3)
lg: 16px  (gap-4)
xl: 24px  (gap-6)
```

### Border Radius
```
Small:   rounded (4px)
Medium:  rounded-lg (8px)
Large:   rounded-[10px] (10px)
Full:    rounded-full
```

---

## Canonical Page Map

### 1. /control — Executive System Overview
**Purpose:** Mission control for system operators  
**Key Elements:**
- Gate status (MARS gates 1-5)
- Live event stream
- Command center actions
- Execution panel
- Health summary
- Claim execution strip

**Status:** ✅ EXISTS — needs consolidation pass

---

### 2. /campaigns — Marketing Performance
**Purpose:** Campaign analytics and lead tracking  
**Key Elements:**
- Source badge (LIVE/DEMO/ERROR)
- KPI cards (spend, leads, CPL, CAC)
- Trend chart
- Campaign table with filters
- CSV import

**Status:** ✅ EXISTS — verified LIVE data

---

### 3. /hot-leads — Sales Action Center
**Purpose:** Hot lead management and rapid response  
**Key Elements:**
- Lead score display
- SLA countdown
- Owner assignment
- Delivery status
- Quick actions (Claim/Defer/Delegate)
- Notification trigger

**Status:** ❌ NEEDS CREATION

---

### 4. /tasks/[id] — Operator Task Detail
**Purpose:** Single task view with full context  
**Key Elements:**
- Task metadata
- Action buttons (Claim/Defer/Delegate)
- Hot lead card (if applicable)
- Execution history
- Action audit trail
- Notification status

**Status:** ✅ EXISTS — recently hardened

---

### 5. /executions — Workflow Trace
**Purpose:** Execution history and debugging  
**Key Elements:**
- Execution list with status
- Stats summary
- Filter by status
- Detailed trace view

**Status:** ✅ EXISTS

---

### 6. /recommendations — Phase 5 Optimization Center
**Purpose:** AI-driven optimization suggestions  
**Key Elements:**
- Recommendation cards
- Impact score
- Confidence level
- Apply/Reject actions
- Category filters

**Status:** ❌ NEEDS CREATION

---

## Component System

### Core UI Components (in /components/ui/)

| Component | Purpose | Status |
|-----------|---------|--------|
| DataStatus | Source badge + last sync | ✅ Ready |
| EmptyState | Loading/error/empty states | ✅ Ready |
| StatusBadge | Generic status indicator | ✅ Ready |
| AtlasButton | Consistent button styles | ✅ Ready |
| Skeleton | Loading placeholders | ✅ Ready |
| Navbar | Navigation | ✅ Ready |

### Feature Components (in /app/components/)

| Component | Purpose | Status |
|-----------|---------|--------|
| TaskActionButtons | Claim/Defer/Delegate | ✅ Ready |
| HotLeadCard | Lead display with actions | ✅ Ready |
| DeliveryStatusBadge | Notification delivery state | ✅ Ready |
| ActionAuditTrail | Audit event timeline | ✅ Ready |
| ExecutionPanel | Execution list widget | ✅ Ready |
| CommandCenter | System command interface | ✅ Ready |
| GateStatusMars | MARS gate indicators | ✅ Ready |
| NotificationBell | Notification dropdown | ✅ Ready |
| NotificationPanel | Full notification list | ✅ Ready |
| RecommendationCard | Optimization suggestion | ❌ Needed |

---

## Implementation Roadmap

### Phase 1: Foundation (Checkpoint 1)
- [ ] Create /hot-leads page with lead list
- [ ] Create /recommendations page structure
- [ ] Add consistent navigation across all pages
- [ ] Standardize source badges

### Phase 2: Feature Completion (Checkpoint 2)
- [ ] Hot lead detail view
- [ ] Recommendation engine integration
- [ ] Cross-page navigation polish
- [ ] Mobile responsiveness pass

### Phase 3: Polish (Checkpoint 3)
- [ ] Animation consistency
- [ ] Loading state standardization
- [ ] Error boundary implementation
- [ ] Final audit

---

## First Checkpoint Target
**Scope:** Create /hot-leads and /recommendations pages with canonical structure  
**ETA:** 30 minutes  
**Deliverable:** Two functional pages with consistent styling

