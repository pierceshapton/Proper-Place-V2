#!/usr/bin/env node

/**
 * Direct database cleanup script
 * Removes all mock data: messages, bookings, reviews, places
 * Keeps: users table (admin, test accounts)
 * 
 * Usage: node cleanup-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Parse DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set!');
  process.exit(1);
}

// Configure connection
let connectionConfig = DATABASE_URL;

if (DATABASE_URL.includes('ondigitalocean')) {
  const url = new URL(DATABASE_URL);
  connectionConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else {
  connectionConfig = {
    connectionString: DATABASE_URL,
  };
}

const pool = new Pool(typeof connectionConfig === 'string' ? { connectionString: connectionConfig } : { ...connectionConfig, connectionTimeoutMillis: 5000 });

async function cleanupDatabase() {
  try {
    console.log('[Cleanup] Connecting to database...');
    console.log('[Cleanup] Database host:', typeof connectionConfig === 'string' ? 'Using connection string' : connectionConfig.host);
    
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 8000))
    ]);

    console.log('[Cleanup] Starting deletion of mock data...\n');

    // 1. Delete messages
    try {
      const messagesResult = await client.query('DELETE FROM messages');
      console.log('✅ Deleted', messagesResult.rowCount, 'messages');
    } catch (err) {
      console.log('ℹ️  Messages table: skipped or does not exist');
    }

    // 2. Delete reviews
    try {
      const reviewsResult = await client.query('DELETE FROM reviews');
      console.log('✅ Deleted', reviewsResult.rowCount, 'reviews');
    } catch (err) {
      console.log('ℹ️  Reviews table: skipped or does not exist');
    }

    // 3. Delete bookings
    try {
      const bookingsResult = await client.query('DELETE FROM bookings');
      console.log('✅ Deleted', bookingsResult.rowCount, 'bookings');
    } catch (err) {
      console.log('ℹ️  Bookings table: skipped or does not exist');
    }

    // 4. Delete places
    try {
      const placesResult = await client.query('DELETE FROM places WHERE deleted_at IS NULL');
      console.log('✅ Deleted', placesResult.rowCount, 'places');
    } catch (err) {
      console.log('ℹ️  Places table: skipped or does not exist');
    }

    // 5. Verify counts
    console.log('\n[Cleanup] Verifying database state...\n');

    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('📊 Users remaining:', usersResult.rows[0].count);

    try {
      const placesCheckResult = await client.query('SELECT COUNT(*) as count FROM places WHERE deleted_at IS NULL');
      console.log('📊 Places remaining:', placesCheckResult.rows[0].count);
    } catch (err) {
      console.log('📊 Places: N/A');
    }

    try {
      const bookingsCheckResult = await client.query('SELECT COUNT(*) as count FROM bookings');
      console.log('📊 Bookings remaining:', bookingsCheckResult.rows[0].count);
    } catch (err) {
      console.log('📊 Bookings: N/A');
    }

    try {
      const messagesCheckResult = await client.query('SELECT COUNT(*) as count FROM messages');
      console.log('📊 Messages remaining:', messagesCheckResult.rows[0].count);
    } catch (err) {
      console.log('📊 Messages: N/A');
    }

    try {
      const reviewsCheckResult = await client.query('SELECT COUNT(*) as count FROM reviews');
      console.log('📊 Reviews remaining:', reviewsCheckResult.rows[0].count);
    } catch (err) {
      console.log('📊 Reviews: N/A');
    }

    client.release();
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('🎉 Ready for fresh test data population.\n');

  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupDatabase();
