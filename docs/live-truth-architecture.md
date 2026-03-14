# ATLAS-UI-LIVE-TRUTH-ARCHITECTURE-1093

## Goal
Convert /campaigns to reflect live operational truth with clear data source indicators and robust state handling.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    /campaigns Page                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Header                                              │    │
│  │ • Source badge (live/demo)                          │    │
│  │ • Last sync indicator                               │    │
│  │ • Connection status                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ useLiveCampaigns Hook                               │    │
│  │ • 30s polling fallback                              │    │
│  │ • Auto-refresh on import                            │    │
│  │ • Error boundary                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│    ┌─────────┐     ┌──────────┐    ┌──────────┐             │
│    │  KPIs   │     │  Table   │    │  Trend   │             │
│    │  Cards  │     │          │    │  Chart   │             │
│    └─────────┘     └──────────┘    └──────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   API Layer         │
                    │   /api/campaigns/*  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Supabase / Demo    │
                    └─────────────────────┘
```

## Data Source Badge States

| Badge | Color | Meaning |
|-------|-------|---------|
| **LIVE** | #16C784 (green) | Connected to Supabase, real data |
| **DEMO** | #FFB020 (amber) | Fallback mode, sample data |
| **ERROR** | #FF3B30 (red) | Connection failed, showing stale/cached |
| **SYNCING** | #6B7280 (gray pulse) | Refresh in progress |

## Last Sync Indicator

- Format: "Updated 2m ago" / "Updated just now"
- Tooltip: Full ISO timestamp
- Auto-updates every 10s

## Error/Empty/Loading States

### Loading
- Skeleton cards for KPIs
- Spinner for table
- "Loading campaigns..." message

### Empty
- "No campaigns found" with import CTA
- Hide KPI cards or show "—"

### Error
- Toast notification
- "Retry" button
- Fall back to cached data if available

## Polling Strategy

```
Initial Load → 30s Interval → On Import Success → Immediate Refresh
     │              │                    │
     ▼              ▼                    ▼
  Loading       Background          Clear cache
  State         Update              refetch
```

## Implementation Files

| File | Purpose |
|------|---------|
| `hooks/useLiveCampaigns.ts` | Main data hook with polling |
| `components/ui/SourceBadge.tsx` | Live/Demo/Error indicator |
| `components/ui/LastSync.tsx` | Relative time display |
| `app/campaigns/page.tsx` | Updated with live truth |

## API Response Shape

```typescript
interface CampaignsResponse {
  campaigns: Campaign[];
  source: "live" | "demo" | "error";
  lastSync: string; // ISO timestamp
  error?: string;
}
```
