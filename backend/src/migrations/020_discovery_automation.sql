-- Migration 020: Discovery automation scoring fields + safe default-off settings

ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS discovery_fit_score INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS discovery_parking_confidence INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS discovery_access_score INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS discovery_campervan_priority INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS discovery_last_analyzed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_host_leads_discovery_fit_score ON host_leads(discovery_fit_score);
CREATE INDEX IF NOT EXISTS idx_host_leads_discovery_campervan_priority ON host_leads(discovery_campervan_priority);

INSERT INTO crm_settings (key, value) VALUES
  ('discovery_auto_email_enabled', 'false'),
  ('discovery_auto_mode_ready', 'false'),
  ('discovery_auto_email_min_fit_score', '85'),
  ('discovery_auto_email_daily_limit', '20')
ON CONFLICT (key) DO NOTHING;
