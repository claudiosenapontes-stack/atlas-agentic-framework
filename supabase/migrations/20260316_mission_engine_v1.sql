-- ATLAS-OPTIMUS-MISSION-ENGINE-BACKEND-203
-- Mission Engine v1 Schema
-- Creates missions table with child task linkage and evidence bundles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core mission fields
    title TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    
    -- Status and phase tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'closed', 'cancelled')),
    phase TEXT NOT NULL DEFAULT 'planning' CHECK (phase IN ('planning', 'execution', 'verification', 'closure')),
    
    -- Ownership and assignment
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_agent TEXT,
    
    -- Company context
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Priority and categorization
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    
    -- Timeline
    target_start_date TIMESTAMPTZ,
    target_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    
    -- Success criteria
    success_criteria JSONB DEFAULT '[]'::jsonb,
    
    -- Evidence bundle (file references, notes, etc.)
    evidence_bundle JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Metrics
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    child_task_count INTEGER DEFAULT 0,
    completed_task_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- MISSION-TASK LINKAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mission_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Role of this task in the mission
    task_role TEXT DEFAULT 'subtask' CHECK (task_role IN ('objective', 'milestone', 'subtask', 'verification', 'closure')),
    
    -- Ordering within mission
    sequence_order INTEGER DEFAULT 0,
    
    -- Blocking relationship
    is_blocking BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique task-mission pairs
    UNIQUE(mission_id, task_id)
);

-- ============================================
-- MISSION STATUS HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS mission_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    
    from_status TEXT,
    to_status TEXT NOT NULL,
    from_phase TEXT,
    to_phase TEXT,
    
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_agent TEXT,
    reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_phase ON missions(phase) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_owner ON missions(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_company ON missions(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_priority ON missions(priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(target_start_date, target_end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_created ON missions(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mission_tasks_mission ON mission_tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_task ON mission_tasks(task_id);

CREATE INDEX IF NOT EXISTS idx_mission_history_mission ON mission_status_history(mission_id);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_missions_updated_at ON missions;
CREATE TRIGGER trigger_missions_updated_at
    BEFORE UPDATE ON missions
    FOR EACH ROW
    EXECUTE FUNCTION update_missions_updated_at();

-- ============================================
-- TRIGGER: Log status changes
-- ============================================
CREATE OR REPLACE FUNCTION log_mission_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.phase IS DISTINCT FROM NEW.phase THEN
        INSERT INTO mission_status_history (
            mission_id,
            from_status,
            to_status,
            from_phase,
            to_phase,
            changed_by,
            changed_by_agent
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            OLD.phase,
            NEW.phase,
            NEW.metadata->>'changed_by',
            NEW.metadata->>'changed_by_agent'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mission_status_log ON missions;
CREATE TRIGGER trigger_mission_status_log
    AFTER UPDATE ON missions
    FOR EACH ROW
    EXECUTE FUNCTION log_mission_status_change();

-- ============================================
-- TRIGGER: Update child task counts
-- ============================================
CREATE OR REPLACE FUNCTION update_mission_task_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update mission child_task_count
    UPDATE missions 
    SET child_task_count = (
        SELECT COUNT(*) FROM mission_tasks WHERE mission_id = COALESCE(NEW.mission_id, OLD.mission_id)
    ),
    completed_task_count = (
        SELECT COUNT(*) FROM mission_tasks mt
        JOIN tasks t ON mt.task_id = t.id
        WHERE mt.mission_id = COALESCE(NEW.mission_id, OLD.mission_id)
        AND t.status = 'completed'
    )
    WHERE id = COALESCE(NEW.mission_id, OLD.mission_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mission_task_count ON mission_tasks;
CREATE TRIGGER trigger_mission_task_count
    AFTER INSERT OR DELETE ON mission_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_mission_task_counts();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_status_history ENABLE ROW LEVEL SECURITY;

-- Missions: Users can read missions they own or are in their company
CREATE POLICY missions_select_policy ON missions
    FOR SELECT USING (
        deleted_at IS NULL AND (
            owner_id = auth.uid() OR
            company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
        )
    );

-- Missions: Users can insert missions
CREATE POLICY missions_insert_policy ON missions
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Missions: Owners can update their missions
CREATE POLICY missions_update_policy ON missions
    FOR UPDATE USING (owner_id = auth.uid());

-- Mission tasks: Read if mission is accessible
CREATE POLICY mission_tasks_select_policy ON mission_tasks
    FOR SELECT USING (
        mission_id IN (SELECT id FROM missions WHERE deleted_at IS NULL)
    );

-- Mission tasks: Write if mission owner
CREATE POLICY mission_tasks_insert_policy ON mission_tasks
    FOR INSERT WITH CHECK (
        mission_id IN (SELECT id FROM missions WHERE owner_id = auth.uid())
    );

-- Status history: Read if mission is accessible
CREATE POLICY mission_history_select_policy ON mission_status_history
    FOR SELECT USING (
        mission_id IN (SELECT id FROM missions WHERE deleted_at IS NULL)
    );

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Mission Engine v1 schema created successfully';
    RAISE NOTICE 'Tables created: missions, mission_tasks, mission_status_history';
END $$;
