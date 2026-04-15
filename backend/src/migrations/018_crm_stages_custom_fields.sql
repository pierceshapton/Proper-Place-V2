-- Migration 018: Custom pipeline stages and custom lead fields

-- Custom pipeline stages
CREATE TABLE IF NOT EXISTS crm_stages (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(50) UNIQUE NOT NULL,  -- stored in host_leads.pipeline_stage
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(30) NOT NULL DEFAULT 'blue',
  sort_order  INT NOT NULL DEFAULT 0,
  is_won      BOOLEAN DEFAULT false,
  is_lost     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing hardcoded stages (no-op if already present)
INSERT INTO crm_stages (slug, name, color, sort_order, is_won, is_lost) VALUES
  ('new',         'New',         'blue',    1, false, false),
  ('contacted',   'Contacted',   'amber',   2, false, false),
  ('assessing',   'Assessing',   'violet',  3, false, false),
  ('negotiating', 'Negotiating', 'orange',  4, false, false),
  ('converted',   'Converted',   'emerald', 5, true,  false),
  ('lost',        'Lost',        'red',     6, false, true)
ON CONFLICT (slug) DO NOTHING;

-- Custom fields attached to every lead
CREATE TABLE IF NOT EXISTS crm_custom_fields (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  field_type    VARCHAR(20) NOT NULL DEFAULT 'text',  -- text | number | select | date | checkbox | url
  options       JSONB DEFAULT '[]',                   -- select only: [{label, color}]
  sort_order    INT NOT NULL DEFAULT 0,
  show_in_table BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Per-lead custom field values
CREATE TABLE IF NOT EXISTS crm_custom_values (
  lead_id   INT NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  field_id  INT NOT NULL REFERENCES crm_custom_fields(id) ON DELETE CASCADE,
  value     TEXT,
  PRIMARY KEY (lead_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_custom_values_lead  ON crm_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_custom_values_field ON crm_custom_values(field_id);
