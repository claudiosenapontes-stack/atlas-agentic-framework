# ATLAS Realtime UI Architecture

## Overview
Convert Atlas dashboard to realtime operational UI with Supabase realtime subscriptions, shared data stores, and automatic UI updates.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Atlas Dashboard                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Campaigns  │  │    Tasks    │  │    Executions       │ │
│  │    Page     │  │    Page     │  │      Page           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                    │            │
│         └────────────────┼────────────────────┘            │
│                          │                                  │
│         ┌────────────────▼────────────────────┐             │
│         │      Realtime Data Store            │             │
│         │  (Zustand + Supabase Realtime)      │             │
│         │                                     │             │
│         │  • campaigns[]                      │             │
│         │  • tasks[]                          │             │
│         │  • executions[]                     │             │
│         │  • alerts[]                         │             │
│         │  • connectionStatus                 │             │
│         └────────────────┬────────────────────┘             │
│                          │                                  │
│         ┌────────────────▼────────────────────┐             │
│         │     Subscription Manager            │             │
│         │                                     │             │
│         │  • Channel multiplexing             │             │
│         │  • Auto-reconnect                   │             │
│         │  • 30s polling fallback             │             │
│         └────────────────┬────────────────────┘             │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Supabase Realtime                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   campaigns  │  │    tasks     │  │   executions     │  │
│  │   channel    │  │   channel    │  │    channel       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Realtime Store (Zustand)
Central state management with reactive updates

### 2. Subscription Manager
- Manages Supabase realtime channels
- Handles connection lifecycle
- Falls back to polling on disconnect

### 3. Entity Subscriptions
- campaigns: INSERT, UPDATE, DELETE
- tasks: INSERT, UPDATE (status changes)
- executions: INSERT, UPDATE (state changes)
- alerts: INSERT (new alerts)

### 4. Connection Status
- realtime: connected/disconnected
- lastUpdate: timestamp
- fallbackActive: boolean

## Data Flow

```
Supabase Change → Channel → Store Update → Component Re-render
                              ↓
                         Polling (30s fallback)
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `lib/realtime-store.ts` (Zustand store)
2. Create `lib/subscription-manager.ts`
3. Create `hooks/useRealtime.ts`

### Phase 2: Entity Subscriptions
1. `hooks/useCampaignsRealtime.ts`
2. `hooks/useTasksRealtime.ts`
3. `hooks/useExecutionsRealtime.ts`
4. `hooks/useAlertsRealtime.ts`

### Phase 3: UI Integration
1. Add RealtimeProvider to layout
2. Update pages to use realtime data
3. Add connection status indicator

## Events Tracked

| Entity | Events | UI Impact |
|--------|--------|-----------|
| campaigns | INSERT, UPDATE, DELETE | Add/remove/update campaign cards |
| tasks | INSERT, UPDATE | Update task lists, status badges |
| executions | INSERT, UPDATE | Real-time execution progress |
| alerts | INSERT | Toast notifications, alert counter |

## Fallback Strategy

1. Primary: Supabase Realtime (WebSocket)
2. Fallback: 30s polling via REST API
3. Reconnection: Exponential backoff (1s, 2s, 4s, 8s, max 30s)

## Security

- RLS policies must allow realtime for authenticated users
- Channel namespaced by user/org
- No sensitive data in channel names
