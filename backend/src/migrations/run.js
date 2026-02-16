const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Build pool config with SSL support for DigitalOcean
let poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Configure SSL for DigitalOcean databases
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ondigitalocean')) {
  console.log('[Migration] Configuring SSL for DigitalOcean...');
  const url = new URL(process.env.DATABASE_URL);
  poolConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false, // Accept DigitalOcean's self-signed certificate
    },
  };
}

const pool = new Pool(poolConfig);

async function runMigrations() {
  try {
    // Run all migration files in order
    const migrationFiles = ['001_init.sql', '002_contacts_table.sql', '003_clear_test_messages.sql'];
    
    for (const file of migrationFiles) {
      const migrationFile = path.join(__dirname, file);
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`Running migration: ${file}...`);
        await pool.query(sql);
        console.log(`✅ ${file} completed`);
      }
    }
    
    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
