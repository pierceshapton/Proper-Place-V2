import { query } from './database.js';

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'normal_user',
  stripe_connect_account_id VARCHAR(255),
  stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  place_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  address VARCHAR(500) NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  image_url VARCHAR(500),
  place_type VARCHAR(100),
  amenities TEXT,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_places_host_id ON places(host_id);
CREATE INDEX IF NOT EXISTS idx_places_approval_status ON places(approval_status);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_bookings_place_id ON bookings(place_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
`;

// Additive migrations for columns that may not exist on an already-running database
const alterMigrationsSQL = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS connected_account_id VARCHAR(255)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_captured BOOLEAN NOT NULL DEFAULT false`,
];

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  try {
    const statements = createTablesSQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }

    // Run additive ALTER TABLE migrations (safe to re-run)
    for (const statement of alterMigrationsSQL) {
      await query(statement);
    }
    
    console.log('✅ Migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => {
    console.log('✅ All migrations completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}
