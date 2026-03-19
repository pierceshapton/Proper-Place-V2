-- Add host_status_seen flag to places table
-- When admin approves/rejects a site, this is set to false
-- When host views their Sites tab, it's set back to true
-- New places default to true (host just submitted, they know it's pending)
ALTER TABLE places ADD COLUMN IF NOT EXISTS host_status_seen BOOLEAN DEFAULT true;
