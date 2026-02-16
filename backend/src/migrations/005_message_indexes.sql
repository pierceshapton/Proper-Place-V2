-- Add indexes for message conversation queries performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created 
  ON messages (receiver_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created 
  ON messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_read 
  ON messages (receiver_id, read) WHERE read = false;

-- Clear all old test/mock message data for fresh start
DELETE FROM messages;
