const { Pool } = require('pg');
require('dotenv').config();

// Log database configuration for debugging
const DATABASE_URL = process.env.DATABASE_URL;
console.log('[Database] Initializing PostgreSQL connection...');
console.log('[Database] DATABASE_URL set:', !!DATABASE_URL);
if (DATABASE_URL) {
  // Log URL without exposing credentials (mask password)
  const urlWithoutPassword = DATABASE_URL.replace(/:[^@]*@/, ':****@');
  console.log('[Database] Connection URL:', urlWithoutPassword);
} else {
  console.error('[Database] ERROR: DATABASE_URL environment variable not set!');
  console.error('[Database] Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB_')));
}

// Configure pool with SSL handling for DigitalOcean
const poolConfig = {
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// For DigitalOcean managed databases, we need to handle SSL certificates
// DigitalOcean uses self-signed certificates that require special handling
if (DATABASE_URL && DATABASE_URL.includes('ondigitalocean')) {
  console.log('[Database] Configuring SSL for DigitalOcean managed database...');
  poolConfig.ssl = {
    rejectUnauthorized: false, // Accept DigitalOcean's self-signed certificate
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err.message);
  console.error('[Database] Error code:', err.code);
});

pool.on('connect', () => {
  console.log('[Database] ✅ Successfully connected to PostgreSQL');
});

module.exports = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('[Database] Query error:', error.message);
      console.error('[Database] Query:', text.substring(0, 100) + '...');
      throw error;
    }
  },
  getClient: () => pool.connect(),
  pool,
};
