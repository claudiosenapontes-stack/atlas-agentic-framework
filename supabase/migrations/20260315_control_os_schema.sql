-- ATLAS-CONTROL-OS Schema Extensions
-- Tables for fleet actions, audit logs, and incident tracking

-- Fleet Actions Log
CREATE TABLE IF NOT EXISTS fleet_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL, -- fleet_audit, pause_all, resume_all, boost_restart_stuck
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  affected_count INTEGER DEFAULT 0,
  details JSONB DEFAULT NULL,
  errors JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fleet_actions IS 'Log of fleet management actions';

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- fleet, systems, connections, services, database
  status VARCHAR(20) NOT NULL, -- pending, running, passed, failed
  message TEXT,
  duration VARCHAR(20),
  details JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'System audit execution logs';

-- Fleet Audits (detailed results)
CREATE TABLE IF NOT EXISTS fleet_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  agents_checked INTEGER DEFAULT 0,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fleet_audits IS 'Detailed fleet audit results';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fleet_actions_timestamp ON fleet_actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_actions_action ON fleet_actions(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_fleet_audits_timestamp ON fleet_audits(timestamp DESC);

-- Add RLS policies (disabled by default for service role access)
ALTER TABLE fleet_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_audits DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users (for future use)
GRANT SELECT ON fleet_actions TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON fleet_audits TO authenticated;
