-- Host applications table for in-app "Become a Host" form submissions
CREATE TABLE IF NOT EXISTS host_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  business_description TEXT,
  address VARCHAR(500),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  business_type VARCHAR(100),
  van_spaces INTEGER DEFAULT 1,
  referral_code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);
CREATE INDEX IF NOT EXISTS idx_host_applications_created_at ON host_applications(created_at DESC);
