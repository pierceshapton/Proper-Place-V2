-- Migration: Clear test/seed messages
-- This removes all test messages created during development

BEGIN;

-- Delete all messages from test users
DELETE FROM messages 
WHERE sender_id IN (
  SELECT id FROM users WHERE email IN (
    'host@example.com', 
    'testuser@example.com', 
    'hostuser@test.com', 
    'normaluser@test.com',
    'admin@test.com',
    'jane.smith@test.com',
    'john.doe@test.com'
  )
) OR receiver_id IN (
  SELECT id FROM users WHERE email IN (
    'host@example.com', 
    'testuser@example.com', 
    'hostuser@test.com', 
    'normaluser@test.com',
    'admin@test.com',
    'jane.smith@test.com',
    'john.doe@test.com'
  )
);

-- Delete messages with test content
DELETE FROM messages 
WHERE content ILIKE '%test%' 
   OR content ILIKE '%example%'
   OR content ILIKE '%approval status%'
   OR content ILIKE '%pricing guidelines%'
   OR content ILIKE '%hi, i have%';

COMMIT;
