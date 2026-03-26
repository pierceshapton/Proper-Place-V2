-- Host leads table for capturing prospective host details from QR code signups
CREATE TABLE IF NOT EXISTS host_leads (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  property_type VARCHAR(100),
  location VARCHAR(255),
  message TEXT,
  source VARCHAR(100) DEFAULT 'qr_code',
  status VARCHAR(50) DEFAULT 'new',
  admin_notes TEXT,
  followed_up_at TIMESTAMP,
  followed_up_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  converted_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering by status and quick lookups
CREATE INDEX IF NOT EXISTS idx_host_leads_status ON host_leads(status);
CREATE INDEX IF NOT EXISTS idx_host_leads_email ON host_leads(email);
CREATE INDEX IF NOT EXISTS idx_host_leads_created_at ON host_leads(created_at DESC);
