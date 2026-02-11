const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    // Run all migration files in order
    const migrationFiles = ['001_init.sql', '002_contacts_table.sql'];
    
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
