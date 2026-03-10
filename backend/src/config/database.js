const { Pool } = require('pg');
const path = require('path');

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '../../', envFile) });

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

// Parse the DATABASE_URL and handle SSL for DigitalOcean
let connectionConfig = DATABASE_URL;

// For DigitalOcean databases, parse URL and configure SSL separately
if (DATABASE_URL && DATABASE_URL.includes('ondigitalocean')) {
  console.log('[Database] Configuring SSL for DigitalOcean managed database...');
  
  // Parse URL and create config object instead of connectionString
  const url = new URL(DATABASE_URL);
  connectionConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: false, // Accept DigitalOcean's self-signed certificate
    },
  };
  console.log('[Database] ✅ SSL configured with rejectUnauthorized: false');
} else {
  // For local development, use connectionString if available
  if (DATABASE_URL) {
    connectionConfig = {
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  } else {
    connectionConfig = {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
}

const pool = new Pool(connectionConfig);

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
