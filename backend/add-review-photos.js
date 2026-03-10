const { Pool } = require('pg');
require('dotenv').config();

const url = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  user: url.username,
  password: url.password,
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[]')
  .then(() => { 
    console.log('Migration successful - added photo_urls column to reviews'); 
    pool.end();
    process.exit(0);
  })
  .catch(e => { 
    console.error('Error:', e.message); 
    pool.end();
    process.exit(1);
  });
