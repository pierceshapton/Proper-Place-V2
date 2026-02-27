const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  console.log('Starting migration...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('Connecting to:', url.hostname);
    
    const pool = new Pool({
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    
    console.log('Running ALTER TABLE...');
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS max_vehicle_height_ft DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS max_vehicle_width_ft DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS max_vehicle_length_ft DECIMAL(4,1)
    `);
    
    console.log('✅ Migration successful!');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

run();
