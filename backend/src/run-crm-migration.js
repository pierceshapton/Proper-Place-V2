const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '016_crm_tables.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ CRM migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
