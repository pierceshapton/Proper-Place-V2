#!/usr/bin/env node

/**
 * Clear test/seed messages from the database
 * This removes all test messages that were created during development/testing
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
let connectionConfig = process.env.DATABASE_URL;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ondigitalocean')) {
  const url = new URL(process.env.DATABASE_URL);
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
      rejectUnauthorized: false,
    },
  };
}

const pool = new Pool(connectionConfig);

async function clearTestMessages() {
  try {
    console.log('🧹 Clearing test messages from database...\n');

    // Get test users first
    const testUsersResult = await pool.query(`
      SELECT id, email FROM users 
      WHERE email IN ('host@example.com', 'testuser@example.com', 'hostuser@test.com', 'normaluser@test.com', 'admin@test.com')
    `);

    const testUserIds = testUsersResult.rows.map(u => u.id);
    console.log(`Found ${testUserIds.length} test users:`);
    testUsersResult.rows.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));

    if (testUserIds.length > 0) {
      // Delete messages involving test users
      const deleteResult = await pool.query(`
        DELETE FROM messages 
        WHERE sender_id = ANY($1) OR receiver_id = ANY($1)
      `, [testUserIds]);

      console.log(`\n✅ Deleted ${deleteResult.rowCount} test messages`);
    }

    // Delete all messages with test content
    const testContentResult = await pool.query(`
      DELETE FROM messages 
      WHERE content ILIKE '%test%' 
         OR content ILIKE '%example%'
         OR content ILIKE '%approval status%'
         OR content ILIKE '%pricing guidelines%'
    `);

    console.log(`✅ Deleted ${testContentResult.rowCount} messages with test content`);

    // Summary
    const remainingMessages = await pool.query('SELECT COUNT(*) as count FROM messages');
    console.log(`\n📊 Database status:`);
    console.log(`   Total messages remaining: ${remainingMessages.rows[0].count}`);

    console.log('\n✨ Test messages cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing test messages:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearTestMessages();
