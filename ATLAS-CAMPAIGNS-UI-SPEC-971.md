# ATLAS-CAMPAIGNS-UI-MVP-971-P

**Status:** Specification Ready for Implementation  
**Owner:** Prime  
**Created:** 2026-03-13 15:59 EDT  
**Frame:** WAR-ROOM  

---

## 1. Page Layout

### Route
```
/campaigns
```

### Navigation Placement
```
Dashboard | Control | Tasks | Agents | Companies | **Campaigns** | Cost
```

Campaigns sits between Companies (business layer) and Cost (operations layer), establishing it as a **business analytics surface** separate from internal finance operations.

---

## 2. Component Inventory

### Layout Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `CampaignsHeader` | Top | Title, subtitle, filter bar |
| `KPIGrid` | Below header | 6 KPI cards in responsive grid |
| `TrendChart` | Left split | 7-day performance trend |
| `AlertPanel` | Right split | Integration status + alerts |
| `CampaignsTable` | Main content | Sortable/filterable campaign data |
| `LeadsPanel` | Lower section | Latest leads + attribution |

### UI Components (Atlas Design System)
| Component | Usage |
|-----------|-------|
| `AtlasButton` | Actions, imports, exports |
| `StatusBadge` | Campaign status, integration status |
| `DataTable` | Campaigns table with sorting |
| `MetricCard` | KPI display with trend indicators |
| `LineChart` | 7-day trend visualization |
| `FilterBar` | Company/platform/date/status filters |
| `EmptyState` | Truthful no-data placeholder |
| `Skeleton` | Loading states |

---

## 3. Section Specifications

### Section 1: Header
```tsx
<CampaignsHeader
  title="Campaigns"
  subtitle="External marketing performance"
  filters={[
    { type: 'company', options: ['All Companies', 'ARQIA', 'Meta', ...] },
    { type: 'platform', options: ['All Platforms', 'Meta Ads', 'ManyChat', 'Manual Import'] },
    { type: 'dateRange', default: 'Last 30 days' },
    { type: 'status', options: ['All', 'Active', 'Paused', 'Completed'] }
  ]}
/>
```

### Section 2: KPI Row (6 metrics)
```tsx
<KPIGrid>
  <MetricCard label="Spend" value="—" prefix="$" trend="vs last period" />
  <MetricCard label="Leads" value="—" trend="vs last period" />
  <MetricCard label="CPL" value="—" prefix="$" tooltip="Cost Per Lead" />
  <MetricCard label="CAC" value="—" prefix="$" tooltip="Customer Acquisition Cost" />
  <MetricCard label="Booked Calls" value="—" />
  <MetricCard label="Closed Deals" value="—" />
</KPIGrid>
```

**Truth states:**
- No data: Show "—" with tooltip "Awaiting data import"
- With data: Show formatted value with trend indicator

### Section 3: Split Row

#### Left: 7-Day Trend Chart
```tsx
<TrendChart
  title="Performance Trend"
  metrics={['spend', 'leads', 'booked']}
  timeframe="7d"
  truthState={dataAvailable ? 'data' : 'placeholder'}
/>
```

**Truth states:**
- No data: "No trend data available — import campaigns to view"
- With data: Line chart with spend/leads/booked overlay

#### Right: Alert Panel
```tsx
<AlertPanel title="Integration Status">
  <IntegrationStatus
    platform="Meta Ads"
    status={metaConnected ? 'connected' : 'disconnected'}
    message={metaConnected ? 'Live data sync active' : 'Meta API not connected — using manual import'}
  />
  <IntegrationStatus
    platform="ManyChat"
    status="reserved"
    message="ManyChat not connected — reserved for next slice"
  />
</AlertPanel>
```

### Section 4: Main Campaigns Table
```tsx
<CampaignsTable
  columns={[
    { key: 'name', label: 'Campaign', sortable: true },
    { key: 'platform', label: 'Platform', filterable: true },
    { key: 'spend', label: 'Spend', format: 'currency', sortable: true },
    { key: 'leads', label: 'Leads', sortable: true },
    { key: 'cpl', label: 'CPL', format: 'currency', tooltip: 'Cost Per Lead' },
    { key: 'booked', label: 'Booked', sortable: true },
    { key: 'closed', label: 'Closed', sortable: true },
    { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true },
    { key: 'roas', label: 'ROAS', format: 'decimal', tooltip: 'Return on Ad Spend' },
    { key: 'status', label: 'Status', component: StatusBadge }
  ]}
  emptyState="No campaign data loaded yet"
/>
```

**Truth states:**
- No data: Empty state with "No campaign data loaded yet" + "Import CSV" CTA
- With data: Full table with sorting/filtering

### Section 5: Lower Panel — Leads & Attribution
```tsx
<LeadsPanel title="Latest Leads & Attribution">
  <LeadRow
    lead={lead}
    show={[
      'name',
      'source',
      'campaign',
      'attribution',
      'dedupStatus',
      'followUpReady'
    ]}
  />
</LeadsPanel>
```

**Columns:**
- Lead name/email
- Attribution source (campaign + platform)
- Dedup status (New / Duplicate / Merged)
- Follow-up readiness (Ready / Pending / Completed)

---

## 4. Truth States Reference

### Integration States
| Platform | State | Message |
|----------|-------|---------|
| Meta Ads | Connected | "Live data sync active" |
| Meta Ads | Disconnected | "Meta API not connected — using manual import" |
| ManyChat | Reserved | "ManyChat not connected — reserved for next slice" |
| Manual CSV | Available | "Import campaigns via CSV" |

### Data States
| State | UI Treatment |
|-------|--------------|
| No data | "No campaign data loaded yet" + Import CTA |
| Loading | Skeleton screens |
| Partial (Meta only) | Show Meta data + ARQIA placeholder |
| Full (Meta + ARQIA) | Complete dashboard |

---

## 5. Implementation Order

### Phase 1: Page Shell (30 min)
1. Create `/campaigns/page.tsx` with layout structure
2. Add to navigation between Companies and Cost
3. Add route to app router

### Phase 2: Header & Filters (45 min)
1. Build `CampaignsHeader` component
2. Implement filter bar (visual only, no logic)
3. Add company/platform/date/status filters

### Phase 3: KPI Grid (30 min)
1. Build `KPIGrid` with 6 `MetricCard` components
2. Implement placeholder truth states
3. Add trend indicator support

### Phase 4: Split Row (60 min)
1. Build `TrendChart` with placeholder state
2. Build `AlertPanel` with integration status
3. Implement Meta/ManyChat truth messages

### Phase 5: Campaigns Table (60 min)
1. Build `CampaignsTable` with DataTable base
2. Implement all 10 columns
3. Add sorting and filtering
4. Build empty state with CSV import CTA

### Phase 6: Leads Panel (45 min)
1. Build `LeadsPanel` with lead rows
2. Add attribution, dedup, follow-up columns
3. Implement placeholder states

### Phase 7: Polish & Truth (30 min)
1. Verify all truth states work
2. Test responsive layout
3. Confirm separation from /cost page

**Total estimated time:** ~5.5 hours

---

## 6. Visual Layer Rules

### Campaigns = Business Analytics
- Background: `#0B0B0C` (same as Tasks/Companies)
- Cards: `#111214` with `#1F2226` borders
- Accent: `#FF6A00` (Atlas primary)
- Success: `#16C784`
- Warning: `#FFB020`

### Separation from Cost
| Aspect | Campaigns | Cost |
|--------|-----------|------|
| Layer | Business | Operations |
| Focus | External marketing | Internal finance |
| Primary metric | ROAS, CPL | Per-agent cost |
| Data source | Meta, ManyChat | Internal execution |
| User | Marketing ops | Finance ops |

---

## 7. API Contract (Future)

```typescript
// Placeholder — awaiting backend
interface Campaign {
  id: string;
  name: string;
  platform: 'meta' | 'manychat' | 'manual';
  companyId: string;
  status: 'active' | 'paused' | 'completed';
  spend: number;
  leads: number;
  bookedCalls: number;
  closedDeals: number;
  revenue: number;
  startDate: string;
  endDate: string;
}

interface LeadAttribution {
  leadId: string;
  campaignId: string;
  source: string;
  dedupStatus: 'new' | 'duplicate' | 'merged';
  followUpReady: boolean;
}
```

---

## 8. Navigation Update

```tsx
// app/components/navbar.tsx
const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Control', href: '/control' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Agents', href: '/agents' },
  { label: 'Companies', href: '/companies' },
  { label: 'Campaigns', href: '/campaigns', isNew: true },  // ← ADD
  { label: 'Cost', href: '/cost' },
];
```

---

**Spec Complete.** Ready for implementation phase.
