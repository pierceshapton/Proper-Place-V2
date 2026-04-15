-- CRM System Tables
-- For prospecting, assessing, and contacting potential host sites

-- Extend host_leads with CRM pipeline fields
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'new';
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS google_reviews_count INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS parking_spaces INTEGER;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2);
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS satellite_image_url TEXT;
ALTER TABLE host_leads ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_host_leads_pipeline_stage ON host_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_host_leads_priority ON host_leads(priority);
CREATE INDEX IF NOT EXISTS idx_host_leads_assigned_to ON host_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_host_leads_next_follow_up ON host_leads(next_follow_up);

-- CRM Activity Log
CREATE TABLE IF NOT EXISTS crm_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON crm_activities(created_at DESC);

-- CRM Tasks / Reminders
CREATE TABLE IF NOT EXISTS crm_tasks (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES host_leads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);

-- CRM Email Templates
CREATE TABLE IF NOT EXISTS crm_email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  template_type VARCHAR(50) DEFAULT 'outreach',
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM Email Sequences (multi-step drip campaigns)
CREATE TABLE IF NOT EXISTS crm_email_sequences (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_email_sequence_steps (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER NOT NULL REFERENCES crm_email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  template_id INTEGER NOT NULL REFERENCES crm_email_templates(id) ON DELETE CASCADE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  stop_on_reply BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_seq_steps_sequence ON crm_email_sequence_steps(sequence_id, step_order);

-- CRM Email Log (every email sent)
CREATE TABLE IF NOT EXISTS crm_email_log (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES crm_email_templates(id) ON DELETE SET NULL,
  sequence_id INTEGER REFERENCES crm_email_sequences(id) ON DELETE SET NULL,
  step_order INTEGER,
  subject VARCHAR(500),
  body TEXT,
  to_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  error_message TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_email_log_lead_id ON crm_email_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_log_sent_at ON crm_email_log(sent_at DESC);

-- CRM Lead Assessments (AI scoring + user decisions for ML learning)
CREATE TABLE IF NOT EXISTS crm_lead_assessments (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  satellite_image_url TEXT,
  ai_assessment JSONB,
  ai_predicted_suitable BOOLEAN,
  ai_confidence DECIMAL(5,2),
  ai_car_park_size VARCHAR(20),
  ai_car_park_polygon JSONB,
  user_decision VARCHAR(30),
  user_adjusted_polygon JSONB,
  ai_was_correct BOOLEAN,
  decision_features JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_assessments_lead_id ON crm_lead_assessments(lead_id);

-- CRM Site Visit Log
CREATE TABLE IF NOT EXISTS crm_site_visits (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  visit_date TIMESTAMP NOT NULL,
  contact_name VARCHAR(200),
  contact_role VARCHAR(100),
  car_park_surface VARCHAR(50),
  car_park_spaces INTEGER,
  motorhome_access VARCHAR(50),
  level_ground BOOLEAN,
  electric_hookup VARCHAR(100),
  water_access BOOLEAN,
  ownership_type VARCHAR(50),
  owner_reaction VARCHAR(50),
  objections TEXT,
  follow_up_agreed BOOLEAN,
  follow_up_date TIMESTAMP,
  photos TEXT[],
  verdict VARCHAR(50),
  verdict_reason TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_site_visits_lead_id ON crm_site_visits(lead_id);

-- CRM Settings
CREATE TABLE IF NOT EXISTS crm_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO crm_settings (key, value) VALUES
  ('auto_mode_threshold', '75'),
  ('default_chaser_days', '[3, 7, 14]'),
  ('ai_provider', '"openai"'),
  ('ai_model', '"gpt-4o-mini"')
ON CONFLICT (key) DO NOTHING;

-- Lead sequence tracking (which leads are in which sequences)
CREATE TABLE IF NOT EXISTS crm_lead_sequences (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES host_leads(id) ON DELETE CASCADE,
  sequence_id INTEGER NOT NULL REFERENCES crm_email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status VARCHAR(30) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paused_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_email_at TIMESTAMP,
  UNIQUE(lead_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_sequences_next ON crm_lead_sequences(next_email_at) WHERE status = 'active';
