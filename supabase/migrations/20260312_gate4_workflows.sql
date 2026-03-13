-- Migration: Create workflows table for Gate 4 orchestration MVP
-- ATLAS-GATE4-MVP-241
-- Created: 2026-03-12

BEGIN;

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    
    -- JSON schema for workflow definition (tasks and their dependencies)
    definition JSONB NOT NULL DEFAULT '{}',
    
    -- Company/tenant isolation
    company_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

-- Add FK constraint to companies
ALTER TABLE workflows
    DROP CONSTRAINT IF EXISTS workflows_company_id_fkey,
    ADD CONSTRAINT workflows_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Add table comment
COMMENT ON TABLE workflows IS 'Gate 4: Workflow definitions for orchestration MVP';
COMMENT ON COLUMN workflows.definition IS 'JSON schema containing workflow tasks and dependency graph';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflows_updated_at ON workflows;
CREATE TRIGGER workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

COMMIT;
