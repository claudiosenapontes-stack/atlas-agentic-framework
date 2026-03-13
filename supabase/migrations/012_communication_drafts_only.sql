-- ============================================-- ATLAS-COMMS-INFRA-FOUNDATION-001-- SQL Execution Script (Manual Execution Required)-- ============================================-- 
INSTRUCTIONS:-- 1. Open https://app.supabase.com/project/ukuicfswabcaioszcunb-- 2. Go to SQL Editor → New Query-- 3. Paste this entire script-- 4. Click "Run"-- 5. Verify output shows "Success" for all statements
-- ============================================-- Step 1: Create communication_drafts table-- ============================================
CREATE TABLE IF NOT EXISTS communication_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  
  -- Draft content
  agent_id TEXT NOT NULL,
  draft_subject TEXT,
  draft_text TEXT NOT NULL,
  
  -- Review state
  status TEXT DEFAULT 'drafted' CHECK (status IN (
    'drafted',
    'awaiting_approval', 
    'approved',
    'rejected',
    'sent'
  )),
  
  -- Approval tracking
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  -- Rejection tracking
  rejection_reason TEXT,
  
  -- Model attribution (for audit)
  model_used TEXT,
  
  -- Linked approval record
  approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================-- Step 2: Create indexes-- ============================================
CREATE INDEX IF NOT EXISTS idx_drafts_communication ON communication_drafts(communication_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON communication_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_agent ON communication_drafts(agent_id);
CREATE INDEX IF NOT EXISTS idx_drafts_approval ON communication_drafts(approval_id);
CREATE INDEX IF NOT EXISTS idx_drafts_created ON communication_drafts(created_at DESC);
-- ============================================-- Step 3: Enable RLS-- ============================================
ALTER TABLE communication_drafts ENABLE ROW LEVEL SECURITY;
-- ============================================-- Step 4: RLS Policies-- ============================================
-- Policy: Agents can read drafts
CREATE POLICY "Agents can read drafts"
  ON communication_drafts FOR SELECT
  USING (true);

-- Policy: Agents can insert drafts  
CREATE POLICY "Agents can insert drafts"
  ON communication_drafts FOR INSERT
  WITH CHECK (true);

-- Policy: System can update drafts
CREATE POLICY "System can update drafts"
  ON communication_drafts FOR UPDATE
  USING (true);
-- ============================================-- Step 5: Enable realtime-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE communication_drafts;
-- ============================================-- Step 6: Create updated_at trigger (if not exists)-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_communication_drafts_updated_at 
  BEFORE UPDATE ON communication_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================-- VERIFICATION QUERIES (Run after execution)-- ============================================
-- Uncomment to verify:
-- SELECT * FROM communication_drafts LIMIT 1;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'communication_drafts';
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'communication_drafts';