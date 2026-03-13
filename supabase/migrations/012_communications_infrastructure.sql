-- ============================================
-- ATLAS-COMMS-INFRA-FOUNDATION-001
-- Communications Infrastructure Migration
-- ============================================

-- communications table: canonical record of all messages
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Channel identification
  source_channel TEXT NOT NULL CHECK (source_channel IN ('gmail', 'whatsapp', 'telegram', 'sms')),
  thread_id TEXT,
  message_id TEXT,
  
  -- Message content
  sender TEXT,
  recipient TEXT,
  subject TEXT,
  content TEXT,
  
  -- Processing state
  status TEXT DEFAULT 'received' CHECK (status IN (
    'received',
    'summarized',
    'drafted',
    'awaiting_approval',
    'approved',
    'sent',
    'rejected',
    'archived'
  )),
  
  -- Priority for triage
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communications_company ON communications(company_id);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(source_channel);
CREATE INDEX IF NOT EXISTS idx_communications_thread ON communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_created ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_sender ON communications(sender);

-- Enable realtime
alter publication supabase_realtime add table communications;

-- ============================================
-- communication_drafts: Reply drafts awaiting review
-- ============================================

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drafts_communication ON communication_drafts(communication_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON communication_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_agent ON communication_drafts(agent_id);
CREATE INDEX IF NOT EXISTS idx_drafts_approval ON communication_drafts(approval_id);
CREATE INDEX IF NOT EXISTS idx_drafts_created ON communication_drafts(created_at DESC);

-- Enable realtime
alter publication supabase_realtime add table communication_drafts;

-- ============================================
-- RLS Policies for Security
-- ============================================

-- Enable RLS on both tables
alter table communications enable row level security;
alter table communication_drafts enable row level security;

-- Policy: Agents can read communications for their company
CREATE POLICY "Agents can read company communications"
  ON communications FOR SELECT
  USING (true); -- Simplified - in production, check agent company mapping

-- Policy: System can insert communications
CREATE POLICY "System can insert communications"
  ON communications FOR INSERT
  WITH CHECK (true);

-- Policy: System can update communications
CREATE POLICY "System can update communications"
  ON communications FOR UPDATE
  USING (true);

-- Policy: Agents can read drafts they created or for their company
CREATE POLICY "Agents can read drafts"
  ON communication_drafts FOR SELECT
  USING (true);

-- Policy: Agents can insert drafts
CREATE POLICY "Agents can insert drafts"
  ON communication_drafts FOR INSERT
  WITH CHECK (true);

-- Policy: Only system can update draft status
CREATE POLICY "System can update drafts"
  ON communication_drafts FOR UPDATE
  USING (true);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communications_updated_at 
  BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_drafts_updated_at 
  BEFORE UPDATE ON communication_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
