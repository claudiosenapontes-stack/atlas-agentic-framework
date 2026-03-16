-- ATLAS-OPTIMUS-EO-CLOSURE-PASS-003
-- Add watchlist_items table for Executive Ops
-- Created: 2026-03-16

BEGIN;

-- WATCHLIST_ITEMS TABLE
CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other' CHECK (category IN ('lead', 'company', 'contact', 'opportunity', 'task', 'event', 'other')),
    entity_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'archived')),
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    reason TEXT,
    alert_triggered_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_items_owner ON watchlist_items(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_company ON watchlist_items(company_id, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_status ON watchlist_items(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_watchlist_items_priority ON watchlist_items(priority) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_watchlist_items_category ON watchlist_items(category, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_entity ON watchlist_items(entity_type, entity_id);

-- RLS
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS watchlist_items_service_all ON watchlist_items FOR ALL USING (true);

COMMIT;